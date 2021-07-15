use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, setup_alloc, AccountId, Balance, Promise};

setup_alloc!();

#[near_bindgen]
#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct RequestProxy {}

#[near_bindgen]
impl RequestProxy {
    #[payable]
    pub fn transfer_with_reference(&mut self, to: AccountId, amount: String,
                                   payment_reference: String) -> Promise {
        let balance: u128 = env::attached_deposit();

        assert!(
            env::is_valid_account_id(to.as_bytes()),
            "Account @{} is invalid",
            to
        );
        let reference_vec: Vec<u8> =
            match hex::decode(payment_reference.replace("0x", "")) {
                Ok(buffer) => buffer,
                _ => panic!("Payment reference value error")
            };
        let amount_u128: u128 =
            match amount.parse() {
                Ok(value) => value,
                _ => panic!("Amount value error")
            };
        assert_eq!(
            amount_u128,
            balance,
            "Not enough tokens (Supplied: {}. Demand: {})",
            amount_u128,
            balance
        );
        assert_eq!(
            reference_vec.len(),
            8,
            "Incorrect length payment reference"
        );

        env::log(format!("Transferring {} yNEAR (~{} NEAR) to account @{} with reference 0x{}",
                         amount_u128, yton(amount_u128), to,
                         hex::encode(reference_vec)).as_bytes());
        Promise::new(to)
            .transfer(amount_u128.clone())
            .into()
    }
}

pub fn yton(yocto_amount: Balance) -> Balance {
    (yocto_amount + (5 * 10u128.pow(23))) / 10u128.pow(24)
}

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::MockedBlockchain;
    use near_sdk::{testing_env, VMContext};

    fn alice_account() -> AccountId { "alice.near".to_string() }

    fn bob_account() -> AccountId { "bob.near".to_string() }

    fn get_context(predecessor_account_id: AccountId, attached_deposit: Balance, is_view: bool
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
            prepaid_gas: 10u64.pow(15),
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
    expected = r#"Not enough tokens (Supplied: 100000000000000000000000000. Demand: 0)"#
    )]
    fn transfer_with_not_enough_money() {
        let context = get_context(alice_account(), 0, false);
        testing_env!(context);
        let mut contract = RequestProxy::default();
        let to = bob_account();
        let amount = "100000000000000000000000000".to_string();
        let payment_reference = "0xffffffffffffff00".to_string();
        contract.transfer_with_reference(to, amount, payment_reference);
    }

    #[test]
    #[should_panic(
    expected = r#"Account @bob*near is invalid"#
    )]
    fn transfer_with_invalid_account() {
        let context = get_context(alice_account(), ntoy(100), false);
        testing_env!(context);
        let mut contract = RequestProxy::default();
        let to = "bob*near".to_string();
        let amount = "100000000000000000000000000".to_string();
        let payment_reference = "0xffffffffffffff00".to_string();
        contract.transfer_with_reference(to, amount, payment_reference);
    }

    #[test]
    #[should_panic(
    expected = r#"Incorrect length payment reference"#
    )]
    fn transfer_with_invalid_parameter_length() {
        let context = get_context(alice_account(), ntoy(100), false);
        testing_env!(context);
        let mut contract = RequestProxy::default();
        let to = bob_account();
        let amount = "100000000000000000000000000".to_string();
        let payment_reference = "0xffffffffffffff".to_string();
        contract.transfer_with_reference(to, amount, payment_reference);
    }

    #[test]
    #[should_panic(
    expected = r#"Payment reference value error"#
    )]
    fn simple_transfer_with_invalid_reference_value() {
        let context = get_context(alice_account(), ntoy(1), false);
        testing_env!(context);
        let mut contract = RequestProxy::default();
        let to = bob_account();
        let amount = "1000000000000000000000000".to_string();
        let payment_reference = "0x123".to_string();
        contract.transfer_with_reference(to, amount, payment_reference);
    }

    #[test]
    #[should_panic(
    expected = r#"Amount value error"#
    )]
    fn simple_transfer_with_invalid_amount() {
        let context = get_context(alice_account(), ntoy(1), false);
        testing_env!(context);
        let mut contract = RequestProxy::default();
        let to = bob_account();
        let amount = "abc".to_string();
        let payment_reference = "0xffffffffffffff00".to_string();
        contract.transfer_with_reference(to, amount, payment_reference);
    }
}
