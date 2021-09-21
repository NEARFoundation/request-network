use crate::utils::*;
use near_sdk::Gas;
use near_sdk::serde_json::json;
use near_sdk_sim::{call, to_yocto};
use std::convert::TryInto;

mod utils;

#[test]
fn test_transfer_with_reference() {
    let initial_alice_balance = to_yocto("100");
    let initial_bob_balance = to_yocto("10");
    let transfer_amount = to_yocto("50");

    let (
        root,
        request_proxy,
        alice
    ) = init_request_proxy(initial_alice_balance);

    let bob = root.create_user(
        "bob".parse().unwrap(),
        initial_bob_balance,
    );

    // Transfer of tokens
    let result = call!(
        alice,
        request_proxy.transfer_with_reference(
            bob.account_id().try_into().unwrap(),
            "0xffffffffffffffff".to_string()
        ),
        deposit = transfer_amount
    );
    result.assert_success();

    println!(
        "test_transfer_with_reference > TeraGas burnt: {}",
        result.gas_burnt() as f64 / 1e12
    );

    // Check Alice balance
    assert_eq_with_gas(
        to_yocto("50"), // 100 - 50
        alice.account().unwrap().amount,
    );

    // Check Bob balance
    assert_eq!(
        to_yocto("60"), // 10 + 50
        bob.account().unwrap().amount
    );
}

#[test]
fn test_transfer_with_receiver_does_not_exist() {
    let initial_alice_balance = to_yocto("100");
    let transfer_amount = to_yocto("50");

    let (
        _root,
        request_proxy,
        alice
    ) = init_request_proxy(initial_alice_balance);

    // Token transfer failed
    let result = call!(
        alice,
        request_proxy.transfer_with_reference(
            "bob".try_into().unwrap(),
            "0xffffffffffffffff".to_string()
        ),
        deposit = transfer_amount
    );
    assert!(result.is_ok());

    println!(
        "test_transfer_with_receiver_does_not_exist > TeraGas burnt: {}",
        result.gas_burnt() as f64 / 1e12
    );

    assert_one_promise_error(
        result.clone(),
        "account \"bob\" doesn't exist"
    );

    assert_eq!(result.logs().len(), 1);
    assert!(
        result.logs()[0]
            .contains("Returning attached deposit of 50000000000000000000000000 to alice")
    );

    // Check Alice balance
    assert_eq_with_gas(
        to_yocto("100"), // Tokens returned
        alice.account().unwrap().amount,
    );
}

#[test]
fn test_transfer_with_not_enough_attached_gas() {
    let initial_alice_balance = to_yocto("100");
    let initial_bob_balance = to_yocto("10");
    let transfer_amount = to_yocto("50");
    let attached_gas: Gas = 30_000_000_000_000; // 30 TeraGas

    let (
        root,
        request_proxy,
        alice
    ) = init_request_proxy(initial_alice_balance);

    let bob = root.create_user(
        "bob".parse().unwrap(),
        initial_bob_balance,
    );

    // Token transfer failed
    let result = alice.call(
        request_proxy.account_id(),
        "transfer_with_reference",
        &json!({
            "to": bob.account_id(),
            "payment_reference": "0xffffffffffffffff".to_string()
        })
        .to_string()
        .into_bytes(),
        attached_gas,
        transfer_amount,
    );
    // No successful outcome is expected
    assert!(!result.is_ok());

    println!(
        "test_transfer_with_not_enough_attached_gas > TeraGas burnt: {}",
        result.gas_burnt() as f64 / 1e12
    );

    assert_one_promise_error(
        result,
        "Not enough attach Gas to call this method"
    );

    // Check Alice balance
    assert_eq_with_gas(
        to_yocto("100"),
        alice.account().unwrap().amount,
    );
}

#[test]
fn test_transfer_with_invalid_parameter_length() {
    let initial_alice_balance = to_yocto("100");
    let transfer_amount = to_yocto("50");

    let (
        _root,
        request_proxy,
        alice
    ) = init_request_proxy(initial_alice_balance);

    // Token transfer failed
    let result = call!(
        alice,
        request_proxy.transfer_with_reference(
            "bob".try_into().unwrap(),
            "0xffffffffffffff".to_string()
        ),
        deposit = transfer_amount
    );
    // No successful outcome is expected
    assert!(!result.is_ok());

    println!(
        "test_transfer_with_invalid_parameter_length > TeraGas burnt: {}",
        result.gas_burnt() as f64 / 1e12
    );

    assert_one_promise_error(
        result,
        "Incorrect length payment reference"
    );

    // Check Alice balance
    assert_eq_with_gas(
        to_yocto("100"),
        alice.account().unwrap().amount,
    );
}

#[test]
fn test_transfer_with_invalid_reference_value() {
    let initial_alice_balance = to_yocto("100");
    let transfer_amount = to_yocto("50");

    let (
        _root,
        request_proxy,
        alice
    ) = init_request_proxy(initial_alice_balance);

    // Token transfer failed
    let result = call!(
        alice,
        request_proxy.transfer_with_reference(
            "bob".try_into().unwrap(),
            "0x123".to_string()
        ),
        deposit = transfer_amount
    );
    // No successful outcome is expected
    assert!(!result.is_ok());

    println!(
        "test_transfer_with_invalid_reference_value > TeraGas burnt: {}",
        result.gas_burnt() as f64 / 1e12
    );

    assert_one_promise_error(
        result,
        "Payment reference value error"
    );

    // Check Alice balance
    assert_eq_with_gas(
        to_yocto("100"),
        alice.account().unwrap().amount,
    );
}
