const { Client } = require('pg');
const db = require("../models");
const nearConfig = require("../config/near.config");
const indexerConfig = nearConfig.getIndexerConfig(nearConfig.env);
const Transaction = db.transactions;

let getTransactionsFromNearIndexerDatabase = async (
  depth = indexerConfig.maxSearchDepthInBlocks,
  limitLines = indexerConfig.limitLinesOfResult
) => {
  // If the 'payer' field is equal to the 'payee' field, it means that the funds are returned to the payer,
  // because the transfer to account "to" has not been completed. For example, if the account 'to' does not exist
  const query = `SELECT t.transaction_hash,
       b.block_hash,
       t.block_timestamp,
       t.signer_account_id as payer,
       r.receiver_account_id as payee,
       COALESCE(a.args::json->>'deposit', '') as deposit,
       COALESCE(a.args::json->>'method_name', '') as method_name,
       COALESCE((a.args::json->'args_json')::json->>'to', '') as "to",
       COALESCE(a.args::json->>'deposit', '') as amount,
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
  AND t.receiver_account_id = $1
  AND b.block_height >= (select max(block_height) from blocks) - $2
  AND EXISTS(
    SELECT 1
    FROM execution_outcome_receipts eor,
         action_receipt_actions ara,
         execution_outcomes eo
    WHERE eor.executed_receipt_id = t.converted_into_receipt_id
      AND ara.receipt_id = eor.produced_receipt_id
      AND eo.receipt_id = eor.produced_receipt_id
      AND ara.action_kind = 'FUNCTION_CALL'
      AND COALESCE(ara.args::json->>'method_name', '') = 'on_transfer_with_reference'
      AND eo.status = 'SUCCESS_VALUE')
ORDER BY b.block_height DESC
LIMIT $3`;

  try {
    let client = new Client({
      connectionString: indexerConfig.pgConnectionString,
    });
    client.connect();
    const res = await client.query(query, [nearConfig.contractName, depth, limitLines]);
    //console.log(res.rows)
    client.end();
    return res.rows;

  } catch (err) {
    console.log(err.stack);
    throw Error(`Error retrieving data: ${err.message}\n${err.stack}`);
  }
};

let clearTransactionCache = () => {
  Transaction.deleteMany({})
    .then(data => {
      console.log(`${data.deletedCount} Transactions were deleted from the cache`);
    })
    .catch(err => {
      throw new Error(err.message || "Some error occurred while removing all transactions.");
    });
};

exports.getTransactionsFromCache = async () => {
  return await Transaction.find({})
    .then(data => {
      return data;
    })
    .catch(err => {
      throw new Error(err.message || "Some error occurred while retrieving transactions.");
    });
};

let storeOneTransaction = (tx) => {
  const transaction = new Transaction({
    transaction_hash: tx.transaction_hash,
    block_hash: tx.block_hash,
    block_timestamp: tx.block_timestamp,
    payer: tx.payer,
    payee: tx.payee,
    deposit: tx.deposit,
    method_name: tx.method_name,
    to: tx.to,
    amount: tx.amount,
    payment_reference: tx.payment_reference
  });

  transaction
    .save(transaction)
    .then(data => {
      console.log(`Transaction ${data.transaction_hash} is cached`);
    })
    .catch(err => {
      throw new Error(err.message || "Some error occurred while saving the Transaction.");
    });
};

exports.storeTransactionsToCache = async () => {
  try {
    const data = await getTransactionsFromNearIndexerDatabase();
    clearTransactionCache();
    data.map((item) => {
      console.log(`The transaction ${item.transaction_hash} saving to cache`);
      storeOneTransaction(item);
    });
  } catch (err) {
    console.log(`Error loading data into cache: ${err.message}\n${err.stack}`);
  }
};
