import { connect, Contract, keyStores, WalletConnection } from 'near-api-js'
import { ethers } from 'ethers'
import md5 from 'crypto-js/md5'
import * as autobahn from 'autobahn-browser/autobahn'
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
    }
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
    await near.connection.provider.query(`account/${account}`, "")
    return true
  } catch (e) {
    console.log(e.stack)
    return false
  }
}

export async function getTransactionsFromIndexer() {
  return await fetch(`${window.location.protocol}//${window.location.hostname}:${serverConfig.serverPort}` +
    '/transactions-from-indexer').then((res) => res.json())
}

export async function storeTransactions() {
  const query = `SELECT t.transaction_hash,
       b.block_hash,
       t.block_timestamp,
       t.signer_account_id as payer,
       r.receiver_account_id as payee,
       COALESCE(a.args::json->>'deposit', '') as deposit,
       COALESCE(a.args::json->>'method_name', '') as method_name,
       COALESCE((a.args::json->'args_json')::json->>'to', '') as "to",
       COALESCE((a.args::json->'args_json')::json->>'amount', '') as amount,
       COALESCE((a.args::json->'args_json')::json->>'payment_reference', '') as payment_reference
FROM transactions t,
     receipts r,
     blocks b,
     transaction_actions a,
     action_receipt_actions ra,
     execution_outcomes e
WHERE t.transaction_hash = r.originated_from_transaction_hash
  AND r.receipt_id = e.receipt_id
  AND b.block_timestamp = r.included_in_block_timestamp
  AND ra.receipt_id = r.receipt_id
  AND ra.action_kind = 'TRANSFER'
  AND t.transaction_hash = a.transaction_hash
  AND a.action_kind = 'FUNCTION_CALL'
  AND e.status = 'SUCCESS_VALUE'
  AND r.predecessor_account_id != 'system'
  AND t.receiver_account_id = :contract_name
  AND b.block_height >=
      (select block_height from blocks order by block_height desc limit 1) - :depth
ORDER BY b.block_height DESC
LIMIT :limit`
  const procedure = serverConfig.remoteProcedureName

  try {
    const connection = new autobahn.Connection({
      url: serverConfig.nearWebSocketUrl,
      realm: "near-explorer"
    })
    connection.onopen = async session => {
      const transactions = await session.call(procedure, [query, {
        contract_name: nearConfig.contractName,
        depth: serverConfig.maxSearchDepthInBlocks,
        limit: serverConfig.limitLinesOfResult
      }]).then(data => {
          console.log(`Returned rows ${data.length}`)
          return data
        }
      ).catch((e) => {
        console.log(e)
      })
      if (transactions && transactions.length > 0) {
        localStorage.setItem('nearTransactions', JSON.stringify(transactions))
      } else {
        console.log('Most likely an error occurred, no transactions')
        localStorage.setItem('nearTransactions', "[]")
      }
      setStateInitializedTransactionStore()
      connection.close()
    }
    connection.onclose = reason => {
      console.log(`Connection close: ${reason}`)
    }
    connection.open()
  } catch (err) {
    console.log(`Error retrieving data: ${err.message}\n${err.stack}`)
  }
}

export function getIndexerTransactionsFromBrowserStorage() {
  let transactions= [];
  if (localStorage.getItem('nearTransactions')) {
    transactions = JSON.parse(localStorage.getItem('nearTransactions'));
  }
  return transactions;
}

export function setStateNotInitializedTransactionStore() {
  localStorage.removeItem("initializedTransactionStore")
  //localStorage.removeItem("nearTransactions")
}

export function hasInitializedTransactionStore() {
  return localStorage.getItem('initializedTransactionStore')
}

function setStateInitializedTransactionStore() {
  localStorage.setItem("initializedTransactionStore", "1")
}
