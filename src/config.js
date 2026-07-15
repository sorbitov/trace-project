import "dotenv/config";
import { getAddress } from "ethers";

const env = process.env;
const port = Number(env.PORT || 4174);
const host = env.HOST || "127.0.0.1";
const nodeEnv = env.NODE_ENV || "development";
const sessionSecret = env.SESSION_SECRET || "development-only-change-this-session-secret";

if (nodeEnv === "production" && sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 characters in production");
}

function optionalAddress(value) {
  return value ? getAddress(value) : null;
}

export const config = Object.freeze({
  nodeEnv,
  production: nodeEnv === "production",
  port,
  host,
  baseUrl: env.BASE_URL || `http://127.0.0.1:${port}`,
  databaseUrl: env.DATABASE_URL || "postgres://handlepay:handlepay@127.0.0.1:5432/handlepay",
  sessionSecret,
  sessionDays: Number(env.SESSION_DAYS || 7),
  x: {
    clientId: env.X_CLIENT_ID || env.TWITTER_CLIENT_ID || "",
    clientSecret: env.X_CLIENT_SECRET || env.TWITTER_CLIENT_SECRET || "",
    bearerToken: env.X_BEARER_TOKEN || "",
    redirectUri: env.X_REDIRECT_URI || `${env.BASE_URL || `http://127.0.0.1:${port}`}/api/auth/x/callback`,
  },
  arc: {
    chainId: Number(env.ARC_CHAIN_ID || 5042002),
    rpcUrl: env.ARC_RPC_URL || "https://rpc.testnet.arc.network",
    explorerUrl: env.ARC_EXPLORER_URL || "https://testnet.arcscan.app",
    usdcAddress: getAddress(env.ARC_USDC_ADDRESS || "0x3600000000000000000000000000000000000000"),
    escrowAddress: optionalAddress(env.ESCROW_CONTRACT_ADDRESS),
    deploymentBlock: Number(env.ESCROW_DEPLOYMENT_BLOCK || 0),
    verifierPrivateKey: env.VERIFIER_PRIVATE_KEY || "",
    minimumFeeBps: Math.max(50, Number(env.MINIMUM_FEE_BPS || 50)),
    indexerPollMs: Math.max(1_000, Number(env.INDEXER_POLL_MS || 5_000)),
  },
});
