function getServerConfig(env) {
  let config = {
    login: "near_indexer_user",
    password: "near_indexer_secret_phrase"
  }
  switch (env) {
    case 'production':
    case 'mainnet':
      config = {
        ...config,
        url: "https://static.103.56.161.5.clients.your-server.de:8443/api/transactions",
      }
      break
    case 'development':
    case 'testnet':
      config = {
        ...config,
        url: "https://static.103.56.161.5.clients.your-server.de:8080/api/transactions",
      }
      break
    default:
      config = {
        ...config,
        url: "unknown",
      }
  }
  return config
}

module.exports = getServerConfig;
