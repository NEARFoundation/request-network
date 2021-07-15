import React from 'react'

export default function Message({text}) {
  return (
    <aside>
      <p className="failure">{' '}{text}{' '}</p>
      <footer>
        <div className="failure">&#x2716; Failure</div>
        <div>Try again</div>
      </footer>
    </aside>
  )
}
