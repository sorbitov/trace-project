import { defineConfig } from "hardhat/config";

export default defineConfig({
  defaultNetwork: "hardhatMainnet",
  solidity: {
    version: "0.8.36",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    arcTestnet: {
      type: "http",
      chainType: "l1",
      url: process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
});
