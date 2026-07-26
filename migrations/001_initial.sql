CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  x_user_id text UNIQUE,
  handle text,
  display_name text,
  wallet_address text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (x_user_id IS NOT NULL OR wallet_address IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_lower_idx
  ON profiles (lower(handle)) WHERE handle IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  x_user_id text,
  x_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS oauth_states (
  state text PRIMARY KEY,
  code_verifier text NOT NULL,
  session_token_hash text NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
  return_to text NOT NULL DEFAULT '/index.html',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_challenges (
  nonce_hash text PRIMARY KEY,
  session_token_hash text NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  message text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  sender_profile_id uuid NOT NULL REFERENCES profiles(id),
  recipient_x_user_id text NOT NULL,
  recipient_handle text NOT NULL,
  identity_hash text NOT NULL,
  amount_units bigint NOT NULL CHECK (amount_units > 0),
  fee_bps integer NOT NULL CHECK (fee_bps BETWEEN 50 AND 1000),
  expiry_days integer NOT NULL CHECK (expiry_days BETWEEN 1 AND 365),
  amount_visibility text NOT NULL CHECK (amount_visibility IN ('public', 'private')),
  sender_visibility text NOT NULL CHECK (sender_visibility IN ('public', 'private')),
  cancel_mode text NOT NULL CHECK (cancel_mode IN ('cancellable', 'locked')),
  memo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'awaiting_funding' CHECK (
    status IN ('awaiting_funding', 'pending', 'claimed', 'cancelled', 'refunded', 'expired', 'failed')
  ),
  onchain_payment_id numeric(78,0) UNIQUE,
  fund_tx_hash text UNIQUE,
  settlement_tx_hash text,
  claim_wallet text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  funded_at timestamptz,
  settled_at timestamptz
);
CREATE INDEX IF NOT EXISTS payments_sender_idx ON payments(sender_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_recipient_idx ON payments(recipient_x_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status, expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  request_id text NOT NULL,
  profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  ip_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS indexer_state (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
