import pg from "pg";
import { randomUUID } from "node:crypto";
import { config } from "./config.js";

function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    xUserId: row.x_user_id,
    walletAddress: row.wallet_address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createDatabase(connectionString = config.databaseUrl) {
  const pool = new pg.Pool({ connectionString, max: Number(process.env.PG_POOL_MAX || 10) });
  pool.on("error", (error) => console.error("PostgreSQL idle client error", error));

  async function tx(work) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    pool,
    async close() { await pool.end(); },
    async health() { return (await pool.query("SELECT 1 AS ok")).rows[0].ok === 1; },

    async createSession(tokenHash, expiresAt) {
      await pool.query(
        "INSERT INTO sessions(token_hash, expires_at) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING",
        [tokenHash, expiresAt],
      );
    },

    async getSession(tokenHash) {
      const { rows } = await pool.query(
        `SELECT s.*, p.handle, p.display_name, p.wallet_address
         FROM sessions s LEFT JOIN profiles p ON p.id = s.profile_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [tokenHash],
      );
      return rows[0] || null;
    },

    async saveOAuthState({ state, codeVerifier, sessionTokenHash, returnTo, expiresAt }) {
      await pool.query(
        `INSERT INTO oauth_states(state, code_verifier, session_token_hash, return_to, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [state, codeVerifier, sessionTokenHash, returnTo, expiresAt],
      );
    },

    async consumeOAuthState(state) {
      return tx(async (client) => {
        const { rows } = await client.query(
          "DELETE FROM oauth_states WHERE state = $1 AND expires_at > now() RETURNING *",
          [state],
        );
        return rows[0] || null;
      });
    },

    async attachXIdentity(sessionTokenHash, xIdentity) {
      return tx(async (client) => {
        const session = (await client.query("SELECT * FROM sessions WHERE token_hash = $1 FOR UPDATE", [sessionTokenHash])).rows[0];
        if (!session) throw Object.assign(new Error("Session expired"), { status: 401 });
        const current = session.profile_id
          ? (await client.query("SELECT * FROM profiles WHERE id = $1 FOR UPDATE", [session.profile_id])).rows[0]
          : null;
        const existing = (await client.query("SELECT * FROM profiles WHERE x_user_id = $1 FOR UPDATE", [xIdentity.id])).rows[0];
        let profile;

        if (current?.x_user_id && current.x_user_id !== xIdentity.id) {
          throw Object.assign(new Error("This session is already linked to another X account."), { status: 409 });
        }
        if (existing && current && existing.id !== current.id) {
          if (existing.wallet_address && current.wallet_address && existing.wallet_address !== current.wallet_address) {
            throw Object.assign(new Error("This X account is already linked to another wallet."), { status: 409 });
          }
          if (!existing.wallet_address && current.wallet_address) {
            await client.query("UPDATE profiles SET wallet_address = $1, updated_at = now() WHERE id = $2", [current.wallet_address, existing.id]);
          }
          await client.query("DELETE FROM profiles WHERE id = $1", [current.id]);
          profile = existing;
        } else if (existing) {
          profile = existing;
        } else if (current) {
          profile = current;
        } else {
          profile = (await client.query("INSERT INTO profiles(x_user_id, handle, display_name) VALUES ($1, $2, $3) RETURNING *", [
            xIdentity.id,
            xIdentity.handle,
            xIdentity.displayName,
          ])).rows[0];
        }

        profile = (await client.query(
          `UPDATE profiles SET x_user_id = $1, handle = $2, display_name = $3, updated_at = now()
           WHERE id = $4 RETURNING *`,
          [xIdentity.id, xIdentity.handle, xIdentity.displayName, profile.id],
        )).rows[0];
        await client.query(
          "UPDATE sessions SET profile_id = $1, x_user_id = $2, x_verified_at = now() WHERE token_hash = $3",
          [profile.id, xIdentity.id, sessionTokenHash],
        );
        return mapProfile(profile);
      });
    },

    async createWalletChallenge({ nonceHash, sessionTokenHash, walletAddress, message, expiresAt }) {
      await pool.query(
        `INSERT INTO wallet_challenges(nonce_hash, session_token_hash, wallet_address, message, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [nonceHash, sessionTokenHash, walletAddress, message, expiresAt],
      );
    },

    async consumeWalletChallenge(nonceHash, sessionTokenHash) {
      return tx(async (client) => {
        const { rows } = await client.query(
          `UPDATE wallet_challenges SET used_at = now()
           WHERE nonce_hash = $1 AND session_token_hash = $2 AND used_at IS NULL AND expires_at > now()
           RETURNING *`,
          [nonceHash, sessionTokenHash],
        );
        return rows[0] || null;
      });
    },

    async attachWallet(sessionTokenHash, walletAddress) {
      return tx(async (client) => {
        const session = (await client.query("SELECT * FROM sessions WHERE token_hash = $1 FOR UPDATE", [sessionTokenHash])).rows[0];
        if (!session) throw Object.assign(new Error("Session expired"), { status: 401 });
        const current = session.profile_id
          ? (await client.query("SELECT * FROM profiles WHERE id = $1 FOR UPDATE", [session.profile_id])).rows[0]
          : null;
        const existing = (await client.query("SELECT * FROM profiles WHERE lower(wallet_address) = lower($1) FOR UPDATE", [walletAddress])).rows[0];
        let profile;

        if (current?.wallet_address && current.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
          throw Object.assign(new Error("This session is already linked to another wallet."), { status: 409 });
        }
        if (existing && current && existing.id !== current.id) {
          if (existing.x_user_id && current.x_user_id && existing.x_user_id !== current.x_user_id) {
            throw Object.assign(new Error("This wallet is already linked to another X account."), { status: 409 });
          }
          if (!existing.x_user_id && current.x_user_id) {
            await client.query(
              "UPDATE profiles SET x_user_id=$1, handle=$2, display_name=$3, updated_at=now() WHERE id=$4",
              [current.x_user_id, current.handle, current.display_name, existing.id],
            );
          }
          await client.query("DELETE FROM profiles WHERE id = $1", [current.id]);
          profile = existing;
        } else if (existing) {
          profile = existing;
        } else if (current) {
          profile = current;
        } else {
          profile = (await client.query("INSERT INTO profiles(wallet_address) VALUES ($1) RETURNING *", [walletAddress])).rows[0];
        }
        profile = (await client.query(
          "UPDATE profiles SET wallet_address = $1, updated_at = now() WHERE id = $2 RETURNING *",
          [walletAddress, profile.id],
        )).rows[0];
        await client.query("UPDATE sessions SET profile_id = $1 WHERE token_hash = $2", [profile.id, sessionTokenHash]);
        return mapProfile(profile);
      });
    },

    async getProfile(profileId) {
      if (!profileId) return null;
      return mapProfile((await pool.query("SELECT * FROM profiles WHERE id = $1", [profileId])).rows[0]);
    },

    async createPayment(payment) {
      const { rows } = await pool.query(
        `INSERT INTO payments(
          id, sender_profile_id, recipient_x_user_id, recipient_handle, identity_hash, amount_units,
          fee_bps, expiry_days, amount_visibility, sender_visibility, cancel_mode, memo, expires_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          payment.id, payment.senderProfileId, payment.recipientXUserId, payment.recipientHandle,
          payment.identityHash, payment.amountUnits, payment.feeBps, payment.expiryDays,
          payment.amountVisibility, payment.senderVisibility, payment.cancelMode, payment.memo, payment.expiresAt,
        ],
      );
      return rows[0];
    },

    async getPayment(id) {
      const { rows } = await pool.query(
        `SELECT p.*, sender.handle AS sender_handle, sender.wallet_address AS sender_wallet
         FROM payments p JOIN profiles sender ON sender.id = p.sender_profile_id WHERE p.id = $1`,
        [id],
      );
      return rows[0] || null;
    },

    async listPayments(profileId, xUserId) {
      if (!profileId && !xUserId) return [];
      const { rows } = await pool.query(
        `SELECT p.*, sender.handle AS sender_handle, sender.wallet_address AS sender_wallet
         FROM payments p JOIN profiles sender ON sender.id = p.sender_profile_id
         WHERE p.sender_profile_id = $1 OR ($2::text IS NOT NULL AND p.recipient_x_user_id = $2)
         ORDER BY p.created_at DESC LIMIT 200`,
        [profileId, xUserId || null],
      );
      return rows;
    },

    async markFunded(id, { onchainPaymentId, txHash, fundedAt }) {
      const { rows } = await pool.query(
        `UPDATE payments SET status='pending', onchain_payment_id=$1, fund_tx_hash=$2, funded_at=$3
         WHERE id=$4 AND status='awaiting_funding' RETURNING *`,
        [onchainPaymentId, txHash, fundedAt, id],
      );
      return rows[0] || null;
    },

    async markFundedFromEvent({ onchainPaymentId, senderWallet, identityHash, amountUnits, txHash, fundedAt }) {
      const { rows } = await pool.query(
        `UPDATE payments p SET status='pending', onchain_payment_id=$1, fund_tx_hash=$2, funded_at=$3
         FROM profiles sender
         WHERE p.sender_profile_id=sender.id AND lower(sender.wallet_address)=lower($4)
           AND p.identity_hash=$5 AND p.amount_units=$6 AND p.status='awaiting_funding'
         RETURNING p.*`,
        [onchainPaymentId, txHash, fundedAt, senderWallet, identityHash, amountUnits],
      );
      return rows[0] || null;
    },

    async markSettlement(onchainPaymentId, status, txHash, walletAddress = null, settledAt = new Date()) {
      const { rows } = await pool.query(
        `UPDATE payments SET status=$1, settlement_tx_hash=$2, claim_wallet=COALESCE($3, claim_wallet), settled_at=$4
         WHERE onchain_payment_id=$5 RETURNING *`,
        [status, txHash, walletAddress, settledAt, onchainPaymentId],
      );
      return rows[0] || null;
    },

    async expirePending() {
      await pool.query("UPDATE payments SET status='expired' WHERE status='pending' AND expires_at < now()");
    },

    async audit({ requestId = randomUUID(), profileId = null, action, targetType = null, targetId = null, ipHash = null, metadata = {} }) {
      await pool.query(
        `INSERT INTO audit_logs(request_id, profile_id, action, target_type, target_id, ip_hash, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [requestId, profileId, action, targetType, targetId, ipHash, metadata],
      );
    },

    async getIndexerBlock() {
      const row = (await pool.query("SELECT value FROM indexer_state WHERE key='escrow_block'")).rows[0];
      return row ? Number(row.value) : null;
    },

    async setIndexerBlock(blockNumber) {
      await pool.query(
        `INSERT INTO indexer_state(key,value) VALUES ('escrow_block',$1)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=now()`,
        [String(blockNumber)],
      );
    },
  };
}
