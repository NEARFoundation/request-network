const { Client } = require('pg');
const getConfig = require('../../src/config')
const getServerConfig = require('../../src/near-utility-server.config')
const nearConfig = getConfig(process.env.NODE_ENV || 'development')
const serverConfig = getServerConfig(process.env.NODE_ENV || 'development')

async function getTransactionsFromNearIndexerDatabase(depth = serverConfig.maxSearchDepthInBlocks,
                                                      limitLines = serverConfig.limitLinesOfResult)
{
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
  AND b.block_height >=
      (select block_height from blocks order by block_height desc limit 1) - $2
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
LIMIT $3`

    try {
        let client = new Client({
            connectionString: serverConfig.pgConnectionString,
        });
        client.connect()
        const res = await client.query(query, [nearConfig.contractName, depth, limitLines])
        //console.log(res.rows)
        client.end()
        return res.rows

    } catch (err) {
        console.log(err.stack)
        throw Error(`Error retrieving data: ${err.message}\n${err.stack}`)
    }
}

module.exports = getTransactionsFromNearIndexerDatabase
