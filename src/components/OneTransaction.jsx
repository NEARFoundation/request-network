import React from 'react'
import Big from 'big.js'
import getConfig from '../config'
const { explorerUrl } = getConfig(process.env.NODE_ENV || 'development')

export default function OneTransaction({tx, onBack}) {
  const gotoExplorer = (e) => {
    e.preventDefault();
    let url =  explorerUrl + "/transactions/" + tx.transaction_hash
    window.open(url, "_blank")
  }

  return (
    <>
      {' '}
      <button onClick={onBack}>Back to transaction log</button>
      {' '}
      <button onClick={gotoExplorer}>View in NEAR Explorer</button>
      <p>
        <b>Transaction details</b>
      </p>
      <div>
        <table className="transactions">
          <thead>
          <tr>
            <th className="column-param-name">Parameter</th>
            <th className="column-param-value">Value</th>
          </tr>
          </thead>
          <tbody>
            <tr>
              <td className="column-param-name">Transaction Hash</td>
              <td className="column-param-value">{tx.transaction_hash}</td>
            </tr>
            <tr>
              <td className="column-param-name">Block Hash</td>
              <td className="column-param-value">{tx.block_hash}</td>
            </tr>
            <tr>
              <td className="column-param-name">Block Timestamp</td>
              <td className="column-param-value">{tx.block_timestamp}</td>
            </tr>
            <tr>
              <td className="column-param-name">Payer</td>
              <td className="column-param-value">{tx.payer}</td>
            </tr>
            <tr>
              <td className="column-param-name">Payee</td>
              <td className="column-param-value">{tx.payee}</td>
            </tr>
            <tr>
              <td className="column-param-name">Deposit</td>
              <td className="column-param-value">{Big(tx.deposit).div(10 ** 24).toString()}&#x24C3;</td>
            </tr>
            <tr>
              <td className="column-param-name">Method Name</td>
              <td className="column-param-value">{tx.method_name}</td>
            </tr>
            <tr>
              <td className="column-param-name">To</td>
              <td className="column-param-value">{tx.to}</td>
            </tr>
            <tr>
              <td className="column-param-name">Amount</td>
              <td className="column-param-value">{Big(tx.amount).div(10 ** 24).toString()}&#x24C3;</td>
            </tr>
            <tr>
              <td className="column-param-name">Payment Reference</td>
              <td className="column-param-value">{tx.payment_reference}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}