module pavilion::utils {
    use sui::{
        coin::{Self, Coin},
        sui::SUI,
        balance,
        kiosk::{Kiosk, KioskOwnerCap},
        dynamic_field as df,
    };
    use std::string::{Self, String};

    // == Constants ==
    
    /// Default commission rate in basis points
    const DEFAULT_COMMISSION_RATE: u64 = 250; // 2.5%

    const MAX_NAME_LENGTH: u64 = 20;
    const MIN_NAME_LENGTH: u64 = 1;
    
    // Error codes
    #[error] const E_INSUFFICIENT_PAYMENT: u8 = 0;
    #[error] const E_INVALID_NAME_LENGTH: u8 = 1;

    // == Payment Helper Functions ==

    /// Split payment into required amount and optional change
    /// Returns (required_balance, optional_change)
    public(package) fun split_payment_with_change(
        mut payment: Coin<SUI>,
        required_amount: u64,
        ctx: &mut TxContext
    ): (balance::Balance<SUI>, Option<Coin<SUI>>) {
        let paid = coin::value(&payment);
        assert!(paid >= required_amount, E_INSUFFICIENT_PAYMENT);
        
        if (required_amount == 0) {
            // free case: return zero balance and all payment
            (balance::zero<SUI>(), option::some(payment))
        } else if (paid == required_amount) {
            // exactly paid: all as required amount, no change
            (coin::into_balance(payment), option::none())
        } else {
            // overpaid: split required amount, return change
            let required_coin = coin::split(&mut payment, required_amount, ctx);
            (coin::into_balance(required_coin), option::some(payment))
        }
    }

    /// Split payment and transfer required amount to recipient
    /// Returns optional change coin
    public(package) fun split_payment_and_transfer(
        mut payment: Coin<SUI>,
        required_amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ): Option<Coin<SUI>> {
        let paid = coin::value(&payment);
        assert!(paid >= required_amount, E_INSUFFICIENT_PAYMENT);
        
        if (required_amount == 0) {
            // free case: return all payment
            option::some(payment)
        } else if (paid == required_amount) {
            // exactly paid: all to recipient, no change
            transfer::public_transfer(payment, recipient);
            option::none()
        } else {
            // overpaid: split and transfer required amount, return change
            let required_coin = coin::split(&mut payment, required_amount, ctx);
            transfer::public_transfer(required_coin, recipient);
            option::some(payment)
        }
    }

    // == Configuration Utilities ==

    /// Get default commission rate in basis points
    public fun default_commission_rate(): u64 {
        DEFAULT_COMMISSION_RATE
    }

    // == Kiosk Utilities ==

    /// Set or update a dynamic field on Kiosk
    public(package) fun set_kiosk_dynamic_field<K: copy + store + drop, V: store + drop>(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        key: K,
        value: V
    ) {
        if (df::exists_(kiosk.uid(), key)) {
            *df::borrow_mut(kiosk.uid_mut_as_owner(cap), key) = value;
        } else {
            df::add(kiosk.uid_mut_as_owner(cap), key, value);
        }
    }

    /// Validate name length
    public(package) fun validate_pavilion_name(name: &String) {
        assert!(string::length(name) > MIN_NAME_LENGTH, E_INVALID_NAME_LENGTH);
        assert!(string::length(name) <= MAX_NAME_LENGTH, E_INVALID_NAME_LENGTH);
    }
}
