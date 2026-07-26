import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  getBytes,
  keccak256,
  parseUnits,
  toUtf8Bytes,
} from "ethers";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const deployment = JSON.parse(await readFile(join(root, "deployments", "arc-testnet.json"), "utf8"));
const privateKey = process.env.SMOKE_PRIVATE_KEY;
if (!privateKey) throw new Error("SMOKE_PRIVATE_KEY is required");

const provider = new JsonRpcProvider(process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network", deployment.chainId, { staticNetwork: true });
const wallet = new Wallet(privateKey, provider);
if (wallet.address.toLowerCase() !== deployment.verifier.toLowerCase()) {
  throw new Error("Smoke wallet must match the deployed verifier for the claim test");
}

const usdc = new Contract(deployment.usdcAddress, [
  "function approve(address spender,uint256 amount) returns (bool)",
], wallet);
const escrow = new Contract(deployment.address, [
  "function createPayment(bytes32 identityHash,uint256 amount,uint64 expiresAt,bool cancellable,uint16 feeBps) returns (uint256)",
  "function claim(uint256 paymentId,address recipient,uint64 authorizationExpiresAt,bytes signature)",
  "function cancel(uint256 paymentId)",
  "function refundExpired(uint256 paymentId)",
  "function claimDigest(uint256 paymentId,address recipient,uint64 authorizationExpiresAt) view returns (bytes32)",
  "event PaymentCreated(uint256 indexed paymentId,address indexed sender,bytes32 indexed identityHash,uint256 amount,uint256 fee,uint64 expiresAt,bool cancellable)",
], wallet);

const amount = parseUnits(process.env.SMOKE_AMOUNT_USDC || "0.1", 6);
const fee = (amount * BigInt(deployment.minimumFeeBps) + 9_999n) / 10_000n;
const explorer = "https://testnet.arcscan.app/tx/";

async function latestTimestamp() {
  return Number((await provider.getBlock("latest")).timestamp);
}

async function createPayment(label, expiresIn, cancellable) {
  const approve = await usdc.approve(deployment.address, amount + fee);
  await approve.wait(1);
  const expiresAt = (await latestTimestamp()) + expiresIn;
  const identity = keccak256(toUtf8Bytes(`trace-smoke:${label}:${Date.now()}`));
  const create = await escrow.createPayment(identity, amount, expiresAt, cancellable, deployment.minimumFeeBps);
  const receipt = await create.wait(1);
  const event = receipt.logs.map((log) => {
    try { return escrow.interface.parseLog(log); } catch { return null; }
  }).find((entry) => entry?.name === "PaymentCreated");
  if (!event) throw new Error(`PaymentCreated was not found for ${label}`);
  return { paymentId: event.args.paymentId, expiresAt, approveHash: approve.hash, createHash: create.hash };
}

const claimPayment = await createPayment("claim", 600, true);
const authorizationExpiresAt = (await latestTimestamp()) + 300;
const digest = await escrow.claimDigest(claimPayment.paymentId, wallet.address, authorizationExpiresAt);
const signature = await wallet.signMessage(getBytes(digest));
const claim = await escrow.claim(claimPayment.paymentId, wallet.address, authorizationExpiresAt, signature);
await claim.wait(1);

const cancelPayment = await createPayment("cancel", 600, true);
const cancel = await escrow.cancel(cancelPayment.paymentId);
await cancel.wait(1);

const refundPayment = await createPayment("refund", 3, false);
while ((await latestTimestamp()) <= refundPayment.expiresAt) {
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}
const refund = await escrow.refundExpired(refundPayment.paymentId);
await refund.wait(1);

console.log(JSON.stringify({
  network: deployment.network,
  contract: deployment.address,
  wallet: wallet.address,
  amountUnits: amount.toString(),
  claim: {
    paymentId: claimPayment.paymentId.toString(),
    create: `${explorer}${claimPayment.createHash}`,
    settle: `${explorer}${claim.hash}`,
  },
  cancel: {
    paymentId: cancelPayment.paymentId.toString(),
    create: `${explorer}${cancelPayment.createHash}`,
    settle: `${explorer}${cancel.hash}`,
  },
  refund: {
    paymentId: refundPayment.paymentId.toString(),
    create: `${explorer}${refundPayment.createHash}`,
    settle: `${explorer}${refund.hash}`,
  },
}, null, 2));
