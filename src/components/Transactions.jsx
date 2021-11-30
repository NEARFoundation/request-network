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
  const [showEmptyContentWarn, setShowEmptyContentWarn] = React.useState(true)
  const [oneTransaction, setOneTransaction] = React.useState({})
  const [timer1, setTimer1] = React.useState(0)

  const clickOnBack = () => {
    unmountTimer(timer1)
    onBack()
  }

  const getTableItemsFromUtilityServer = async () => {
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
    setShowEmptyContentWarn(false)
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

  const mountTimer = (handler, timeout) => {
    return setInterval(handler, timeout)
  }

  const unmountTimer = (timer) => {
    if (timer) {
      clearInterval(timer)
    }
  }

  React.useEffect(
    () => {
      setTimer1(mountTimer(() => getTableItemsFromUtilityServer(), 10000))
      getTableItemsFromUtilityServer()
      return () => {
        unmountTimer(timer1)
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
      <button onClick={clickOnBack} hidden={showOneTransaction}>Back to Home</button>
      {!showOneTransaction ?
        <>
          <p/>
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
            {showEmptyContentWarn && !tableItems.length ?
              <p className="empty-content">Information will be received within a minute ...</p> : ""
            }
          </div>
          {showErrorMessage && <Message text={errorMessage}/>}
        </>
        : <OneTransaction tx={oneTransaction} onBack={home}/>
      }
    </>
  )
}
