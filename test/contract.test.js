import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";
import {
  AbiCoder,
  BrowserProvider,
  ContractFactory,
  MaxUint256,
  getBytes,
  keccak256,
  parseUnits,
} from "ethers";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

let connection;
let provider;
let owner;
let sender;
let recipient;
let verifier;
let treasury;
let outsider;
let usdc;
let escrow;

async function expectRevert(work) {
  await assert.rejects(async () => {
    const transaction = await work();
    if (transaction?.wait) await transaction.wait();
  });
}

async function createPayment({ amount = "10", expiresIn = 3_600, cancellable = true, identity = null } = {}) {
  // BrowserProvider can briefly cache "latest" after Hardhat time travel.
  const block = await connection.provider.request({ method: "eth_getBlockByNumber", params: ["latest", false] });
  const blockTimestamp = Number.parseInt(block.timestamp, 16);
  const identityHash = identity || keccak256(new TextEncoder().encode(`x:${Math.random()}`));
  const transaction = await escrow.connect(sender).createPayment(
    identityHash,
    parseUnits(amount, 6),
    blockTimestamp + expiresIn,
    cancellable,
    50,
  );
  const receipt = await transaction.wait();
  const event = receipt.logs.map((log) => { try { return escrow.interface.parseLog(log); } catch { return null; } })
    .find((item) => item?.name === "PaymentCreated");
  return { paymentId: event.args.paymentId, identityHash };
}

before(async () => {
  const [usdcArtifact, escrowArtifact] = await Promise.all([
    readFile(join(root, "artifacts", "contracts", "MockUSDC.sol", "MockUSDC.json"), "utf8").then(JSON.parse),
    readFile(join(root, "artifacts", "contracts", "HandlePaymentEscrow.sol", "HandlePaymentEscrow.json"), "utf8").then(JSON.parse),
  ]);
  connection = await network.create("hardhatMainnet");
  provider = new BrowserProvider(connection.provider);
  [owner, sender, recipient, verifier, treasury, outsider] = await Promise.all(
    [0, 1, 2, 3, 4, 5].map((index) => provider.getSigner(index)),
  );
  const usdcFactory = new ContractFactory(usdcArtifact.abi, usdcArtifact.bytecode, owner);
  usdc = await usdcFactory.deploy();
  await usdc.waitForDeployment();
  const escrowFactory = new ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, owner);
  escrow = await escrowFactory.deploy(
    await usdc.getAddress(),
    await verifier.getAddress(),
    await treasury.getAddress(),
    await owner.getAddress(),
    50,
  );
  await escrow.waitForDeployment();
  await (await usdc.mint(await sender.getAddress(), parseUnits("1000", 6))).wait();
  await (await usdc.connect(sender).approve(await escrow.getAddress(), MaxUint256)).wait();
});

after(async () => { await connection?.close(); });

test("createPayment escrows principal and routes the mandatory fee", async () => {
  const treasuryBefore = await usdc.balanceOf(await treasury.getAddress());
  const { paymentId } = await createPayment({ amount: "100" });
  const payment = await escrow.payments(paymentId);
  assert.equal(payment.sender, await sender.getAddress());
  assert.equal(payment.amount, parseUnits("100", 6));
  assert.equal(await usdc.balanceOf(await escrow.getAddress()), parseUnits("100", 6));
  assert.equal((await usdc.balanceOf(await treasury.getAddress())) - treasuryBefore, parseUnits("0.5", 6));
});

test("claim signature is bound to payment, recipient, chain, contract and expiry", async () => {
  const { paymentId } = await createPayment({ amount: "25" });
  const authorizationExpiresAt = Math.floor(Date.now() / 1000) + 600;
  const digest = await escrow.claimDigest(paymentId, await recipient.getAddress(), authorizationExpiresAt);
  const signature = await verifier.signMessage(getBytes(digest));
  const balanceBefore = await usdc.balanceOf(await recipient.getAddress());
  await (await escrow.connect(outsider).claim(paymentId, await recipient.getAddress(), authorizationExpiresAt, signature)).wait();
  assert.equal((await usdc.balanceOf(await recipient.getAddress())) - balanceBefore, parseUnits("25", 6));
  await expectRevert(async () => escrow.claim(paymentId, await recipient.getAddress(), authorizationExpiresAt, signature));

  const wrongWalletPayment = await createPayment();
  const wrongWalletDigest = await escrow.claimDigest(wrongWalletPayment.paymentId, await recipient.getAddress(), authorizationExpiresAt);
  const wrongWalletSignature = await verifier.signMessage(getBytes(wrongWalletDigest));
  await expectRevert(async () => escrow.claim(wrongWalletPayment.paymentId, await outsider.getAddress(), authorizationExpiresAt, wrongWalletSignature));

  const wrongChainPayment = await createPayment();
  const chainId = (await provider.getNetwork()).chainId;
  const wrongChainDigest = keccak256(AbiCoder.defaultAbiCoder().encode(
    ["string", "uint256", "address", "uint256", "address", "uint64"],
    ["HANDLEPAY_CLAIM", chainId + 1n, await escrow.getAddress(), wrongChainPayment.paymentId, await recipient.getAddress(), authorizationExpiresAt],
  ));
  const wrongChainSignature = await verifier.signMessage(getBytes(wrongChainDigest));
  await expectRevert(async () => escrow.claim(wrongChainPayment.paymentId, await recipient.getAddress(), authorizationExpiresAt, wrongChainSignature));
});

test("expired authorizations are rejected", async () => {
  const { paymentId } = await createPayment();
  const expired = Math.floor(Date.now() / 1000) - 1;
  const digest = await escrow.claimDigest(paymentId, await recipient.getAddress(), expired);
  const signature = await verifier.signMessage(getBytes(digest));
  await expectRevert(async () => escrow.claim(paymentId, await recipient.getAddress(), expired, signature));
});

test("pause blocks create and claim but never blocks sender refund", async () => {
  const { paymentId } = await createPayment({ amount: "5", expiresIn: 10 });
  await (await escrow.connect(owner).setPaused(true)).wait();
  await expectRevert(() => createPayment());
  const authExpiry = Math.floor(Date.now() / 1000) + 600;
  const digest = await escrow.claimDigest(paymentId, await recipient.getAddress(), authExpiry);
  const signature = await verifier.signMessage(getBytes(digest));
  await expectRevert(async () => escrow.claim(paymentId, await recipient.getAddress(), authExpiry, signature));
  await connection.provider.request({ method: "evm_increaseTime", params: [11] });
  await connection.provider.request({ method: "evm_mine", params: [] });
  await (await escrow.connect(sender).refundExpired(paymentId)).wait();
  assert.equal((await escrow.payments(paymentId)).status, 2n);
  await (await escrow.connect(owner).setPaused(false)).wait();
});

test("cancel is sender-only and locked payments require expiry", async () => {
  const cancellable = await createPayment();
  await expectRevert(() => escrow.connect(outsider).cancel(cancellable.paymentId));
  await (await escrow.connect(sender).cancel(cancellable.paymentId)).wait();
  assert.equal((await escrow.payments(cancellable.paymentId)).status, 3n);

  const locked = await createPayment({ cancellable: false, expiresIn: 10 });
  await expectRevert(() => escrow.connect(sender).cancel(locked.paymentId));
  await connection.provider.request({ method: "evm_increaseTime", params: [11] });
  await connection.provider.request({ method: "evm_mine", params: [] });
  await (await escrow.connect(sender).refundExpired(locked.paymentId)).wait();
  assert.equal((await escrow.payments(locked.paymentId)).status, 2n);
});

test("owner rotation and verifier zero-address protections work", async () => {
  await expectRevert(() => escrow.connect(owner).setVerifier("0x0000000000000000000000000000000000000000"));
  await (await escrow.connect(owner).transferOwnership(await outsider.getAddress())).wait();
  await expectRevert(() => escrow.connect(sender).acceptOwnership());
  await (await escrow.connect(outsider).acceptOwnership()).wait();
  assert.equal(await escrow.owner(), await outsider.getAddress());
});
