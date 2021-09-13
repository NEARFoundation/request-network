import 'regenerator-runtime/runtime'
import React from 'react'
import { login, logout, calculatePaymentReference, defaultSalt, isValidAccountId } from './utils'
import Form from './components/Form'
import Transactions from './components/Transactions'
import Message from './components/Message'
import Big from 'big.js'

import getConfig from './config'
const { networkId } = getConfig(process.env.NODE_ENV || 'development')
const BOATLOAD_OF_GAS = Big(3).times(10 ** 13).toFixed();

export default function App() {
  const [showErrorMessage, setShowErrorMessage] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState("")
  const [showTransactions, setShowTransactions] = React.useState(false)

  const sendErrorMessage = (message) => {
    setErrorMessage(message)
    setShowErrorMessage(true)
    setTimeout(() => {
      setShowErrorMessage(false)
      setErrorMessage("")
    }, 11000)
  }

  const transactions = () => {
    setShowTransactions(true)
  }

  const home = () => {
    setShowTransactions(false)
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const { fieldset, receiver, amount, requestId, salt } = e.target.elements;

    let transferAmount = Big(amount.value || '0').times(10 ** 24).toFixed()
    if (transferAmount === "0") {
      sendErrorMessage("The transfer amount cannot be zero")
      return
    }
    let balance = Big(window.currentUser.balance).div(10 ** 24)
    if (parseFloat(amount.value || '0') > parseFloat(balance)) {
      sendErrorMessage(`The amount cannot be more than ${balance} N`)
      return
    }
    if (!await isValidAccountId(receiver.value)) {
      sendErrorMessage("Invalid receiver NEAR account")
      return
    }
    fieldset.disabled = true;

    try {
      // make an update call to the smart contract
      await window.contract.transfer_with_reference(
        {
          to: receiver.value,
          payment_reference: calculatePaymentReference(requestId.value, salt.value, receiver.value)
        },
        BOATLOAD_OF_GAS,
        transferAmount
      )
    } catch (e) {
      sendErrorMessage(e.message)
    } finally {
      fieldset.disabled = false
    }
  }

  return (
    <main>
      <h1>NEAR Transfer example</h1>
      { window.currentUser
        ? <button onClick={logout}>Log out</button>
        : <>
            {!showTransactions &&
              <>
                <p>
                  This example demonstrates payments using NEAR tokens
                  and viewing the transaction log with a RequestProxy smart contract deployed in NEAR.
                </p>
                <p>
                  By default, when your app runs in "development" mode, it connects
                  to a test network ("testnet") wallet. This works just like the main
                  network ("mainnet") wallet, but the NEAR Tokens on testnet aren't
                  convertible to other currencies – they're just for testing!
                </p>
                <p>
                  Go ahead and click the button below to try it out:
                </p>
              </>
            }
            <button onClick={login}>Log in</button>
        </>
      }
      {' '}<button onClick={transactions} hidden={showTransactions}>Transaction log ...</button>
      { window.currentUser && !showTransactions &&
        <><Form onSubmit={onSubmit} currentUser={window.currentUser}
                requestId={"Test RequestId value..."} salt={defaultSalt()} networkId={networkId}
                calculatePaymentReference={calculatePaymentReference}/>
          {showErrorMessage && <Message text={errorMessage}/>}
        </>
      }
      { showTransactions && <Transactions onBack={home}/>}
    </main>
  );
}
