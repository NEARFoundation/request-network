const { Client } = require('pg');
const getConfig = require('../../src/config')
const getServerConfig = require('../../src/near-utility-server.config')
const nearConfig = getConfig(process.env.NODE_ENV || 'development')
const serverConfig = getServerConfig(process.env.NODE_ENV || 'development')

async function getTransactionsFromNearIndexerDatabase(depth = serverConfig.maxSearchDepthInBlocks,
                                                      limitLines = serverConfig.limitLinesOfResult)
{
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
  AND t.transaction_hash = a.transaction_hash
  AND a.action_kind = 'FUNCTION_CALL'
  AND e.status = 'SUCCESS_VALUE'
  AND r.predecessor_account_id != 'system'
  AND t.receiver_account_id = $1
  AND b.block_height >=
      (select block_height from blocks order by block_height desc limit 1) - $2
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

async function getTransactionsFromPaymentReferenceAndAddress(address, paymentReference) {
    const query = `SELECT t.transaction_hash as "txHash",
        b.block_height as block,
        t.block_timestamp as "blockTimestamp",
        t.signer_account_id as payer,
        r.receiver_account_id as payee,
        COALESCE(a.args::json->>'deposit', '') as deposit,
        COALESCE(a.args::json->>'method_name', '') as method_name,
        COALESCE((a.args::json->'args_json')::json->>'to', '') as "to",
        COALESCE((a.args::json->'args_json')::json->>'amount', '') as amount,
        (a.args::json->'args_json')::json->>'payment_reference' as paymentReference,
        (select MAX(block_height) from blocks) - b.block_height as confirmations
        FROM transactions t
        INNER JOIN transaction_actions a ON (a.transaction_hash = t.transaction_hash)
        INNER JOIN receipts r ON (r.originated_from_transaction_hash = t.transaction_hash)
        INNER JOIN blocks b ON (b.block_timestamp = r.included_in_block_timestamp)
        INNER JOIN execution_outcomes e ON (e.receipt_id = r.receipt_id)
        INNER JOIN action_receipt_actions ra ON (ra.receipt_id = r.receipt_id)
        WHERE t.receiver_account_id = $2
        AND r.predecessor_account_id != 'system'
        AND a.action_kind = 'FUNCTION_CALL'
        AND e.status = 'SUCCESS_VALUE'
        AND t.receiver_account_id = $1
        AND b.block_height >= (select MAX(block_height) from blocks) - 1e8
        AND (a.args::json->'args_json')::json->>'payment_reference' = $3
        AND ra.action_kind = 'TRANSFER'
        ORDER BY b.block_height DESC
        LIMIT 100`;

    try {
        const client = new Client({
        connectionString: this.connectionString,
        });
        await client.connect();
        const res = await client.query(query, [nearConfig.contractName, address, `0x${paymentReference}`]);
        await client.end();
        return res.rows;
    } catch (err) {
        console.log(err.stack);
        throw Error(`Error retrieving data: ${err.message}\n${err.stack}`);
    }
}

module.exports = {getTransactionsFromNearIndexerDatabase, getTransactionsFromPaymentReference}
