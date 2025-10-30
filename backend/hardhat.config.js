require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337
    },
    local: {
      url: "http://localhost:8545",
      chainId: 1337
    }
  },
  paths: {
    artifacts: "../shared/contracts",
    deployments: "../deployments"
  },
  mocha: {
    timeout: 40000
  }
};