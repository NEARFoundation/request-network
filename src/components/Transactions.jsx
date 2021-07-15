import React from 'react'
import Big from 'big.js'
import { getTransactionsFromIndexer } from '../utils'
import OneTransaction from '../components/OneTransaction'
import Message from '../components/Message'

export default function Transactions({onBack}) {
  const [tableItems, setTableItems] = React.useState([])
  const [showErrorMessage, setShowErrorMessage] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [showOneTransaction, setShowOneTransaction] = React.useState(false)
  const [oneTransaction, setOneTransaction] = React.useState({})

  const getTableItems = async () => {
    try {
      const result = await getTransactionsFromIndexer()
      if (result && result.success) {
        setTableItems(result.data)
      } else {
        sendErrorMessage(result ? result.error : 'Unknown error')
      }
    } catch (e) {
      sendErrorMessage(e.message)
    }
  }

  const sendErrorMessage = (message) => {
    setErrorMessage(message)
    setShowErrorMessage(true)
    setTimeout(() => {
      setShowErrorMessage(false)
      setErrorMessage("")
    }, 11000)
  }

  const oneTransactions = (e) => {
    e.preventDefault();
    let href = e.target.href.toString()
    let posDelimiter = href.indexOf("#")
    if (posDelimiter < 0) {
      return false
    }
    let id = href.substring(posDelimiter + 1)
    let tx = tableItems.find(tx => tx.transaction_hash === id)
    if (!tx) {
      return false
    }
    setOneTransaction(tx)
    setShowOneTransaction(true)
  }

  const home = () => {
    setShowOneTransaction(false)
  }

  React.useEffect(
    () => {
      const timerId = setInterval(() => getTableItems(), 10000)
      getTableItems()
      return () => {
        clearInterval(timerId)
      }
    }, []
  )

  const Row = ({item}) => (
    <tr>
      <td>
        <a href={"#" + item.transaction_hash} onClick={oneTransactions}>
          {item.transaction_hash.substring(0, 8) + "..."}
        </a>
      </td>
      <td>{item.payer}</td>
      <td>{item.payee}</td>
      <td className="column-amount">{Big(item.amount).div(10 ** 24).toString()}&#x24C3;</td>
    </tr>
  )

  return (
    <>
      {' '}
      <button onClick={onBack} hidden={showOneTransaction}>Back to Home</button>
      {!showOneTransaction ?
        <>
          <p>
            Select a data source: TODO...
          </p>
          <div>
            <table className="transactions">
              <thead>
                <tr>
                <th className="column-tx-hash">Tx Hash</th>
                <th className="column-payer">Payer</th>
                <th className="column-payee">Payee</th>
                <th className="column-amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {tableItems.map((value, index) => (
                  <Row key={index} item={value} />
                ))}
              </tbody>
            </table>
          </div>
          {showErrorMessage && <Message text={errorMessage}/>}
        </>
        : <OneTransaction tx={oneTransaction} onBack={home}/>
      }
    </>
  )
}