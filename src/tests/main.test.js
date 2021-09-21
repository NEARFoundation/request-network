const { contractName, isEqualWithGas, createAccount, getNear, parseNearAmount } = require('./test-utils')

beforeAll(async function () {
  const near = await getNear()
  window.account = await near.account(contractName)
  window.contract = await near.loadContract(contractName, {
    viewMethods: [],
    changeMethods: ['transfer_with_reference'],
    sender: window.account.accountId
  })
  window.GAS = "50000000000000" // 50 TeraGas

  window.walletConnection = {
    requestSignIn() {
    },
    signOut() {
    },
    isSignedIn() {
      return true
    },
    getAccountId() {
      return window.account.accountId
    }
  }
})

test('check_successfully_transfer', async () => {
  let aliceAccount = await createAccount("5") // 5 NEAR
  let payerBalanceStart = (await window.account.state()).amount
  let transfer_amount = parseNearAmount("2") // 2 NEAR

  await window.contract.transfer_with_reference({
    to: aliceAccount.accountId,
    payment_reference: "0xffffffffffffff00"
  }, window.GAS, transfer_amount.toString())

  const payerBalanceEnd = (await window.account.state()).amount
  expect(isEqualWithGas(payerBalanceStart - transfer_amount, payerBalanceEnd)).toBe(true)

  const aliceBalance = (await aliceAccount.state()).amount // 5 + 2 NEAR
  expect(aliceBalance).toEqual(parseNearAmount("7").toString())
})

test('check_transfer_with_receiver_does_not_exist', async () => {
  let payerBalanceStart = (await window.account.state()).amount
  let transfer_amount = parseNearAmount("2") // 2 NEAR

  await window.contract.transfer_with_reference({
    to: "bob.testnet",
    payment_reference: "0xffffffffffffff00"
  }, window.GAS, transfer_amount.toString())

  const payerBalanceEnd = (await window.account.state()).amount
  expect(isEqualWithGas(payerBalanceStart, payerBalanceEnd)).toBe(true)
})

test('check_transfer_with_invalid_parameter_length', async () => {
  try {
    await window.contract.transfer_with_reference({
      to: window.account.accountId,
      payment_reference: "0xffffffffffffff"
    }, window.GAS, parseNearAmount("2").toString())
    expect(false)
  } catch(e) {
    expect(e.toString()).toEqual(expect.stringContaining("Incorrect length payment reference"))
  }
})

test('check_transfer_with_invalid_reference_value', async () => {
  try {
    await window.contract.transfer_with_reference({
      to: window.account.accountId,
      payment_reference: "0x123"
    }, window.GAS, parseNearAmount("2").toString())
    expect(false)
  } catch(e) {
    expect(e.toString()).toEqual(expect.stringContaining("Payment reference value error"))
  }
})

test('check_transfer_with_not_enough_attached_gas', async () => {
  try {
    await window.contract.transfer_with_reference({
      to: window.account.accountId,
      payment_reference: "0xffffffffffffff00"
    }, "30000000000000", parseNearAmount("2").toString()) // Gas = 30 TeraGas
    expect(false)
  } catch(e) {
    expect(e.toString()).toEqual(expect.stringContaining("Not enough attach Gas to call this method"))
  }
})

test('check_transfer_with_incorrect_account', async () => {
  try {
    await window.contract.transfer_with_reference({
      to: "bob*testnet",
      payment_reference: "0xffffffffffffff00"
    }, window.GAS, parseNearAmount("2").toString())
    expect(false)
  } catch(e) {
    console.log(e.toString())
    expect(e.toString()).toEqual(expect.stringContaining("The account ID is invalid"))
  }
})
