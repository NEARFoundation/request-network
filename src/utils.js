import { connect, Contract, keyStores, WalletConnection } from 'near-api-js'
import { ethers } from 'ethers'
import md5 from 'crypto-js/md5'
import getConfig from './config'
import getServerConfig from '../src/near-utility-server.config'

const nearConfig = getConfig(process.env.NODE_ENV || 'development')
const serverConfig = getServerConfig(process.env.NODE_ENV || 'development')

// Initialize contract & set global variables
export async function initContract() {
  // Initialize connection to the NEAR testnet
  const near = await connect(Object.assign({ deps: { keyStore: new keyStores.BrowserLocalStorageKeyStore() } }, nearConfig))

  // Initializing Wallet based Account. It can work with NEAR testnet wallet that
  // is hosted at https://wallet.testnet.near.org
  window.walletConnection = new WalletConnection(near)

  // Load in account data
  window.currentUser = undefined
  if(walletConnection.getAccountId()) {
    window.currentUser = {
      accountId: walletConnection.getAccountId(),
      balance: (await walletConnection.account().state()).amount
    };
  }

  // Initializing our contract APIs by contract name and configuration
  window.contract = await new Contract(window.walletConnection.account(), nearConfig.contractName, {
    // Change methods can modify the state. But you don't receive the returned value when called.
    changeMethods: ['transfer_with_reference'] //,
    //sender: window.walletConnection.getAccountId()
  })
}

export function logout() {
  window.walletConnection.signOut()
  // reload page
  window.location.replace(window.location.origin + window.location.pathname)
}

export function login() {
  // Allow the current app to make calls to the specified contract on the
  // user's behalf.
  // This works by creating a new access key for the user's account and storing
  // the private key in localStorage.
  window.walletConnection.requestSignIn(nearConfig.contractName)
}

function keccak256Hash(data) {
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data))
}

export function calculatePaymentReference(requestId, salt, address) {
  return `0x${keccak256Hash((requestId + salt + address).toLowerCase()).slice(-16)}`
}

export function defaultSalt() {
  return md5(Math.random().toString(36).substring(2)).toString().slice(-16)
}

export async function isValidAccountId(account) {
  const near = window.walletConnection._near
  try {
    await near.connection.provider.query(`account/${account}`, "");
    return true
  } catch (e) {
    console.log(e.stack)
    return false
  }
}

export async function getTransactionsFromIndexer() {
  return await fetch(serverConfig.serverUrl + '/transactions-from-indexer').then((res) => res.json())
}
