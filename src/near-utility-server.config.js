const UTILITY_SERVER_PORT = process.env.UTILITY_SERVER_PORT || 3000

function getServerConfig(env) {
  let config = {
    serverPort: UTILITY_SERVER_PORT,
    //Maximum search depth in the last blocks
    maxSearchDepthInBlocks: 1e8,
    //The maximum number of lines of the result
    limitLinesOfResult: 100
  }

  // Public NEAR Indexer database (see: https://github.com/near/near-indexer-for-explorer)
  switch (env) {
    case 'production':
    case 'mainnet':
      config = {
        ...config,
        pgConnectionString: "postgres://public_readonly:nearprotocol@104.199.89.51/mainnet_explorer",
      }
      break
    case 'development':
    case 'testnet':
      config = {
        ...config,
        pgConnectionString: "postgres://public_readonly:nearprotocol@35.184.214.98/testnet_explorer",
      }
      break
    default:
      config = {
        ...config,
        pgConnectionString: "unknown",
      }
  }
  return config
}

module.exports = getServerConfig;
