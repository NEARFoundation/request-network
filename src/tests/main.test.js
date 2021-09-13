beforeAll(async function () {
  // NOTE: nearlib and nearConfig are made available by near-cli/test_environment
  const near = await nearlib.connect(nearConfig)
  window.accountId = nearConfig.contractName
  window.contract = await near.loadContract(nearConfig.contractName, {
    viewMethods: [],
    changeMethods: ['transfer_with_reference'],
    sender: window.accountId
  })
  window.GAS = "200000000000000"

  window.walletConnection = {
    requestSignIn() {
    },
    signOut() {
    },
    isSignedIn() {
      return true
    },
    getAccountId() {
      return window.accountId
    }
  }
})

test('check transfer_with_reference', async () => {
  await window.contract.transfer_with_reference({
    to: window.accountId,
    payment_reference: "0xffffffffffffff00"
  }, window.GAS, "200000000000000000000000")
  expect(true)
})

test('check cannot transfer_with_reference', async () => {
  try {
    await window.contract.transfer_with_reference({
      to: window.accountId,
      payment_reference: "0xffffffffffffff"
    }, window.GAS, "200000000000000000000000")
    expect(false)
  } catch(e) {
    console.log(e)
    expect(true)
  }
})
