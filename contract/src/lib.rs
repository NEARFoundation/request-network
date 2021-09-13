use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::{env, near_bindgen, setup_alloc, Promise};
use near_sdk::serde_json::json;
use near_sdk::json_types::{ValidAccountId, U128};

setup_alloc!();

#[near_bindgen]
#[derive(Default, BorshDeserialize, BorshSerialize)]
pub struct RequestProxy {}

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

        let reference_vec: Vec<u8> = hex::decode(
            payment_reference.replace("0x", "")
        ).expect("Payment reference value error");
        assert_eq!(
            reference_vec.len(),
            8,
            "Incorrect length payment reference"
        );

        env::log(&json!({
            "amount": U128::from(amount),
            "receiver": to.to_string(),
            "reference": hex::encode(reference_vec)
        })
          .to_string()
          .into_bytes()
        );

        Promise::new(to.as_ref().into())
            .transfer(amount.clone())
            .into()
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
    expected = r#"Incorrect length payment reference"#
    )]
    fn transfer_with_invalid_parameter_length() {
        let context = get_context(alice_account(), ntoy(100), false);
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
        let context = get_context(alice_account(), ntoy(1), false);
        testing_env!(context);
        let mut contract = RequestProxy::default();
        let to = bob_account().try_into().unwrap();
        let payment_reference = "0x123".to_string();
        contract.transfer_with_reference(to, payment_reference);
    }
}
