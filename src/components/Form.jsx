import React from 'react'

export default function Form(props) {
  const [receiver, setReceiver] = React.useState(`.${props.networkId}`)
  const [requestId, setRequestId] = React.useState(props.requestId)
  const [salt, setSalt] = React.useState(props.salt)

  return (
    <form onSubmit={props.onSubmit}>
      <fieldset id="fieldset">
        <p>Payer NEAR account: { props.currentUser.accountId }</p>
        <p className="highlight">
          <label htmlFor="receiver">Receiver NEAR account:</label>
          <input
            autoComplete="off"
            autoFocus
            id="receiver"
            value={receiver}
            onChange={e => setReceiver(e.target.value)}
          />
        </p>
        <p>
          <label htmlFor="amount">Amount:</label>
          <input
            autoComplete="off"
            defaultValue={'0'}
            id="amount"
            min="0"
            step="0.000001"
            type="number"
          />
          <span title="NEAR Tokens">&#x24C3;</span>
        </p>
        <button type="submit">
          Pay now
        </button>
        <p>Additional options for generate a PaymentReference parameter</p>
        <p className="highlight">
          <label htmlFor="requestId">Request ID (optional):</label>
          <input
            autoComplete="off"
            id="requestId"
            value={requestId}
            onChange={e => setRequestId(e.target.value)}
          />
        </p>
        <p className="highlight">
          <label htmlFor="salt">Salt (optional):</label>
          <input
            autoComplete="off"
            id="salt"
            value={salt}
            onChange={e => setSalt(e.target.value)}
          />
        </p>
        <p>PaymentReference: { props.calculatePaymentReference(requestId, salt, receiver) }</p>
      </fieldset>
    </form>
  )
}
