import "dotenv/config";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ContractFactory, JsonRpcProvider, Wallet, getAddress } from "ethers";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const required = ["DEPLOYER_PRIVATE_KEY", "VERIFIER_PRIVATE_KEY", "TREASURY_ADDRESS"];
for (const name of required) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

const rpcUrl = process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network";
const expectedChainId = BigInt(process.env.ARC_CHAIN_ID || 5042002);
const usdcAddress = getAddress(process.env.ARC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000");
const provider = new JsonRpcProvider(rpcUrl, Number(expectedChainId));
const network = await provider.getNetwork();
if (network.chainId !== expectedChainId) throw new Error(`Wrong chain: expected ${expectedChainId}, got ${network.chainId}`);

const deployer = new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
const verifier = new Wallet(process.env.VERIFIER_PRIVATE_KEY).address;
const treasury = getAddress(process.env.TREASURY_ADDRESS);
const owner = getAddress(process.env.CONTRACT_OWNER_ADDRESS || deployer.address);
const feeBps = Number(process.env.MINIMUM_FEE_BPS || 50);
const artifact = JSON.parse(await readFile(join(root, "artifacts", "contracts", "HandlePaymentEscrow.sol", "HandlePaymentEscrow.json"), "utf8"));
const factory = new ContractFactory(artifact.abi, artifact.bytecode, deployer);
const contract = await factory.deploy(usdcAddress, verifier, treasury, owner, feeBps);
const receipt = await contract.deploymentTransaction().wait(1);
const address = await contract.getAddress();

const deployment = {
  network: "arc-testnet",
  chainId: Number(network.chainId),
  address,
  usdcAddress,
  verifier,
  treasury,
  owner,
  minimumFeeBps: feeBps,
  deploymentBlock: receipt.blockNumber,
  transactionHash: receipt.hash,
  deployedAt: new Date().toISOString(),
};
await mkdir(join(root, "deployments"), { recursive: true });
await writeFile(join(root, "deployments", "arc-testnet.json"), `${JSON.stringify(deployment, null, 2)}\n`);
console.log(JSON.stringify(deployment, null, 2));
