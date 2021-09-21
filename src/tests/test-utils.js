// NOTE: nearAPI, nearlib and nearConfig are made available by near-cli/test_environment
const { utils: { format: { parseNearAmount } }, keyStores: { InMemoryKeyStore } } = nearAPI
const keyStore = new InMemoryKeyStore()
const contractName = nearConfig.contractName
const testAccountName = 'test.near'

const generateUniqueString = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000000)}`
}

const getNear = async () => {
  return await nearlib.connect(nearConfig)
}

const createAccount = async (initialBalance, accountId) => {
  accountId = accountId || generateUniqueString('test')
  console.log("Create new Account: " + accountId)

  const near = await getNear()
  const masterAccount = await near.account(testAccountName)
  const newKeyPair = await nearlib.KeyPair.fromRandom('ed25519')
  await masterAccount.createAccount(accountId, newKeyPair.publicKey, parseNearAmount(initialBalance))
  await keyStore.setKey(nearConfig.networkId, accountId, newKeyPair)

  return await near.account(accountId)
}

const isEqualWithGas = (left, right) => {
  return Math.abs(left - right) < 50000000000000000000000 // allowable difference: 0.05 NEAR
}

module.exports = {
  contractName,
  isEqualWithGas,
  createAccount,
  getNear,
  parseNearAmount
}
