use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{
    env,
    assert_self,
    ext_contract,
    is_promise_success,
    near_bindgen,
    setup_alloc,
    AccountId,
    Balance,
    Gas,
    Promise
};
use near_sdk::serde_json::json;
use near_sdk::json_types::{ValidAccountId, U128};

setup_alloc!();

const NO_DEPOSIT: Balance = 0;
const MIN_GAS: Gas = 50_000_000_000_000;
const CALLBACK: Gas = 25_000_000_000_000;

#[near_bindgen]
#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct RequestProxy {}

#[ext_contract(ext_self)]
pub trait ExtRequestProxy {
    fn on_transfer_with_reference(
        &mut self,
        account_id: AccountId,
        amount_sent: U128,
        predecessor_account_id: AccountId
    ) -> bool;
}

#[near_bindgen]
impl RequestProxy {
    #[payable]
    pub fn transfer_with_reference(
        &mut self,
        to: ValidAccountId,
        payment_reference: String
    ) -> Promise
    {
        let amount: u128 = env::attached_deposit();
        let serializable_amount = U128::from(amount);

        assert!(
            MIN_GAS <= env::prepaid_gas(),
            "Not enough attach Gas to call this method (Supplied: {}. Demand: {})",
            env::prepaid_gas(),
            MIN_GAS
        );

        let reference_vec: Vec<u8> = hex::decode(
            payment_reference.replace("0x", "")
        ).expect("Payment reference value error");
        assert_eq!(
            reference_vec.len(),
            8,
            "Incorrect length payment reference"
        );

        let receiver_account_id = to.to_string();
        env::log(&json!({
            "amount": serializable_amount,
            "receiver": receiver_account_id,
            "reference": hex::encode(reference_vec)
        })
          .to_string()
          .into_bytes(),
        );

        Promise::new(receiver_account_id.clone())
          .transfer(amount)
          .then(ext_self::on_transfer_with_reference(
              receiver_account_id,
              serializable_amount,
              env::predecessor_account_id(),
              &env::current_account_id(),
              NO_DEPOSIT,
              CALLBACK
          ))
    }

    pub fn on_transfer_with_reference(
        &mut self,
        account_id: AccountId,
        amount_sent: U128,
        predecessor_account_id: AccountId
    ) -> bool {
        assert_self();

        if is_promise_success() {
            env::log(
                format!(
                    "Transferring {} yNEAR from {} to account {}",
                    amount_sent.0,
                    predecessor_account_id,
                    account_id
                ).as_bytes(),
            );
            true
        } else {
            env::log(
                format!(
                    "Failed to transfer to account {}. Returning attached deposit of {} to {}",
                    account_id, amount_sent.0, predecessor_account_id
                ).as_bytes(),
            );
            Promise::new(predecessor_account_id).transfer(amount_sent.0);
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::{MockedBlockchain, AccountId, Balance};
    use near_sdk::{testing_env, VMContext};
    use std::convert::TryInto;

    fn alice_account() -> AccountId { "alice.near".to_string() }

    fn bob_account() -> AccountId { "bob.near".to_string() }

    fn get_context(
        predecessor_account_id: AccountId,
        attached_deposit: Balance,
        prepaid_gas: Gas,
        is_view: bool
    ) -> VMContext {
        VMContext {
            current_account_id: predecessor_account_id.clone(),
            signer_account_id: predecessor_account_id.clone(),
            signer_account_pk: vec![0, 1, 2],
            predecessor_account_id,
            input: vec![],
            block_index: 1,
            block_timestamp: 0,
            epoch_height: 1,
            account_balance: 0,
            account_locked_balance: 0,
            storage_usage: 10u64.pow(6),
            attached_deposit,
            prepaid_gas,
            random_seed: vec![0, 1, 2],
            is_view,
            output_data_receivers: vec![],
        }
    }

    fn ntoy(near_amount: Balance) -> Balance {
        near_amount * 10u128.pow(24)
    }

    #[test]
    #[should_panic(
    expected = r#"Incorrect length payment reference"#
    )]
    fn transfer_with_invalid_parameter_length() {
        let context = get_context(
            alice_account(),
            ntoy(100),
            10u64.pow(14),
            false
        );
        testing_env!(context);
        let mut contract = RequestProxy::default();
        let to = bob_account().try_into().unwrap();
        let payment_reference = "0xffffffffffffff".to_string();
        contract.transfer_with_reference(to, payment_reference);
    }

    #[test]
    #[should_panic(
    expected = r#"Payment reference value error"#
    )]
    fn transfer_with_invalid_reference_value() {
        let context = get_context(
            alice_account(),
            ntoy(1),
            10u64.pow(14),
            false
        );
        testing_env!(context);
        let mut contract = RequestProxy::default();
        let to = bob_account().try_into().unwrap();
        let payment_reference = "0x123".to_string();
        contract.transfer_with_reference(to, payment_reference);
    }

    #[test]
    #[should_panic(
    expected = r#"Not enough attach Gas to call this method"#
    )]
    fn transfer_with_not_enough_gas() {
        let context = get_context(
            alice_account(),
            ntoy(1),
            10u64.pow(13),
            false
        );
        testing_env!(context);
        let mut contract = RequestProxy::default();
        let to = bob_account().try_into().unwrap();
        let payment_reference = "0xffffffffffffffff".to_string();
        contract.transfer_with_reference(to, payment_reference);
    }
}
