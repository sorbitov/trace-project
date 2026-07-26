import {
  AbiCoder,
  Interface,
  JsonRpcProvider,
  Wallet,
  getAddress,
  getBytes,
  keccak256,
  parseUnits,
  toUtf8Bytes,
} from "ethers";
import { config } from "./config.js";

export const usdcInterface = new Interface([
  "function approve(address spender,uint256 amount) returns (bool)",
]);

export const escrowInterface = new Interface([
  "function createPayment(bytes32 identityHash,uint256 amount,uint64 expiresAt,bool cancellable,uint16 feeBps) returns (uint256)",
  "function claim(uint256 paymentId,address recipient,uint64 authorizationExpiresAt,bytes signature)",
  "function cancel(uint256 paymentId)",
  "function refundExpired(uint256 paymentId)",
  "event PaymentCreated(uint256 indexed paymentId,address indexed sender,bytes32 indexed identityHash,uint256 amount,uint256 fee,uint64 expiresAt,bool cancellable)",
  "event PaymentClaimed(uint256 indexed paymentId,address indexed recipient)",
  "event PaymentRefunded(uint256 indexed paymentId)",
  "event PaymentCancelled(uint256 indexed paymentId)",
]);

export const provider = new JsonRpcProvider(config.arc.rpcUrl, config.arc.chainId, { staticNetwork: true });

async function assertArcChain() {
  const actualChainId = BigInt(await provider.send("eth_chainId", []));
  if (actualChainId !== BigInt(config.arc.chainId)) {
    throw Object.assign(new Error(`Wrong RPC chain: expected ${config.arc.chainId}, got ${actualChainId}`), { status: 503 });
  }
}

export function chainConfigured() {
  return Boolean(config.arc.escrowAddress);
}

export function identityHash(xUserId) {
  return keccak256(toUtf8Bytes(`x:${xUserId}`));
}

export function parseAmountUnits(amount) {
  try {
    const units = parseUnits(String(amount), 6);
    if (units <= 0n) throw new Error();
    return units;
  } catch {
    throw Object.assign(new Error("Amount must be a positive USDC value with at most 6 decimals."), { status: 400 });
  }
}

export function fundingTransactions(payment) {
  if (!chainConfigured()) throw Object.assign(new Error("ESCROW_CONTRACT_ADDRESS is not configured."), { status: 503 });
  const amount = BigInt(payment.amount_units);
  const fee = (amount * BigInt(payment.fee_bps) + 9_999n) / 10_000n;
  return {
    approve: {
      to: config.arc.usdcAddress,
      data: usdcInterface.encodeFunctionData("approve", [config.arc.escrowAddress, amount + fee]),
    },
    create: {
      to: config.arc.escrowAddress,
      data: escrowInterface.encodeFunctionData("createPayment", [
        payment.identity_hash,
        amount,
        Math.floor(new Date(payment.expires_at).getTime() / 1000),
        payment.cancel_mode === "cancellable",
        payment.fee_bps,
      ]),
    },
    totalUnits: String(amount + fee),
    feeUnits: String(fee),
  };
}

export async function verifyFundingTransaction(payment, transactionHash) {
  if (!chainConfigured()) throw Object.assign(new Error("Escrow contract is not configured."), { status: 503 });
  const [receipt, transaction] = await Promise.all([
    provider.getTransactionReceipt(transactionHash),
    provider.getTransaction(transactionHash),
    assertArcChain(),
  ]);
  if (!receipt || receipt.status !== 1 || !transaction) {
    throw Object.assign(new Error("Funding transaction is not confirmed."), { status: 409 });
  }
  if (transaction.to?.toLowerCase() !== config.arc.escrowAddress.toLowerCase()) {
    throw Object.assign(new Error("Transaction was not sent to the configured escrow."), { status: 400 });
  }
  if (transaction.from.toLowerCase() !== payment.sender_wallet.toLowerCase()) {
    throw Object.assign(new Error("Funding transaction sender does not match the authenticated wallet."), { status: 403 });
  }

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== config.arc.escrowAddress.toLowerCase()) continue;
    try {
      const parsed = escrowInterface.parseLog(log);
      if (parsed?.name !== "PaymentCreated") continue;
      if (
        parsed.args.sender.toLowerCase() !== payment.sender_wallet.toLowerCase() ||
        parsed.args.identityHash.toLowerCase() !== payment.identity_hash.toLowerCase() ||
        parsed.args.amount !== BigInt(payment.amount_units) ||
        parsed.args.fee !== (BigInt(payment.amount_units) * BigInt(payment.fee_bps) + 9_999n) / 10_000n ||
        parsed.args.expiresAt !== BigInt(Math.floor(new Date(payment.expires_at).getTime() / 1000)) ||
        parsed.args.cancellable !== (payment.cancel_mode === "cancellable")
      ) continue;
      return {
        onchainPaymentId: parsed.args.paymentId.toString(),
        fundedAt: new Date((await provider.getBlock(receipt.blockNumber)).timestamp * 1000),
        receipt,
      };
    } catch {
      // Ignore unrelated logs.
    }
  }
  throw Object.assign(new Error("PaymentCreated event did not match this intent."), { status: 400 });
}

export async function claimAuthorization(payment, recipientWallet) {
  if (!config.arc.verifierPrivateKey) {
    throw Object.assign(new Error("VERIFIER_PRIVATE_KEY is not configured."), { status: 503 });
  }
  if (!payment.onchain_payment_id || payment.status !== "pending") {
    throw Object.assign(new Error("Payment is not claimable."), { status: 409 });
  }
  await assertArcChain();
  const recipient = getAddress(recipientWallet);
  const authorizationExpiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
  const digest = keccak256(AbiCoder.defaultAbiCoder().encode(
    ["string", "uint256", "address", "uint256", "address", "uint64"],
    ["HANDLEPAY_CLAIM", config.arc.chainId, config.arc.escrowAddress, payment.onchain_payment_id, recipient, authorizationExpiresAt],
  ));
  const verifier = new Wallet(config.arc.verifierPrivateKey);
  const signature = await verifier.signMessage(getBytes(digest));
  return {
    authorizationExpiresAt,
    signature,
    transaction: {
      to: config.arc.escrowAddress,
      data: escrowInterface.encodeFunctionData("claim", [payment.onchain_payment_id, recipient, authorizationExpiresAt, signature]),
    },
  };
}

export function settlementTransaction(payment, action) {
  if (!payment.onchain_payment_id) throw Object.assign(new Error("Payment is not funded."), { status: 409 });
  const method = action === "refund" ? "refundExpired" : "cancel";
  return {
    to: config.arc.escrowAddress,
    data: escrowInterface.encodeFunctionData(method, [payment.onchain_payment_id]),
  };
}

export async function verifySettlementTransaction(payment, transactionHash) {
  const receipt = await provider.getTransactionReceipt(transactionHash);
  if (!receipt || receipt.status !== 1) throw Object.assign(new Error("Settlement transaction is not confirmed."), { status: 409 });
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== config.arc.escrowAddress.toLowerCase()) continue;
    try {
      const parsed = escrowInterface.parseLog(log);
      if (!parsed || parsed.args.paymentId.toString() !== String(payment.onchain_payment_id)) continue;
      const statuses = { PaymentClaimed: "claimed", PaymentCancelled: "cancelled", PaymentRefunded: "refunded" };
      if (!statuses[parsed.name]) continue;
      return {
        status: statuses[parsed.name],
        walletAddress: parsed.name === "PaymentClaimed" ? parsed.args.recipient : null,
        settledAt: new Date((await provider.getBlock(receipt.blockNumber)).timestamp * 1000),
      };
    } catch {
      // Ignore unrelated logs.
    }
  }
  throw Object.assign(new Error("Expected escrow settlement event was not found."), { status: 400 });
}
