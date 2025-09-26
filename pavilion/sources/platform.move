module pavilion::platform {
    use sui::{
        coin::{Self, Coin},
        sui::SUI,
        package::{Self},
        balance,
    };
    use pavilion::utils;

    // == Structs ==

    /// Package init witness
    public struct PLATFORM has drop {}

    /// Admin capability
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Global config for opening fee
    public struct PlatformConfig has key, store {
        id: UID,
        opening_fee: u64,
    }

    /// Treasury for SUI opening fees
    public struct Treasury has key, store {
        id: UID,
        vault: balance::Balance<SUI>,
    }


    // == Constants ==

    const INITIAL_OPENING_FEE: u64 = 10_000_000; // 0.01 SUI (in MIST)
    
    // Error codes
    #[error] const E_INSUFFICIENT_PAYMENT: u8 = 1;

    // == Module Initialization ==

    /// Init: create AdminCap and claim Publisher
    #[allow(lint(share_owned))]
    fun init(otw: PLATFORM, ctx: &mut TxContext) {
        let admin_cap = AdminCap { id: object::new(ctx) };

        transfer::share_object(create_platform_config(&admin_cap, INITIAL_OPENING_FEE, ctx));
        transfer::share_object(create_treasury(&admin_cap, ctx));
        transfer::transfer(admin_cap, ctx.sender());
        transfer::public_transfer(package::claim(otw, ctx), ctx.sender());
    }

    // == Platform Opening Fee Config ==

    /// Create and share PlatformConfig
    fun create_platform_config(
        _admin: &AdminCap,
        initial_opening_fee: u64,
        ctx: &mut TxContext
    ): PlatformConfig {
        let cfg = PlatformConfig { id: object::new(ctx), opening_fee: initial_opening_fee };
        cfg
    }

    /// Create and share Treasury
    fun create_treasury(
        _admin_cap: &AdminCap,
        ctx: &mut TxContext
    ): Treasury{
        Treasury { id: object::new(ctx), vault: balance::zero<SUI>() }
    }

    /// Update opening fee
    public fun update_opening_fee(
        _admin: &AdminCap,
        cfg: &mut PlatformConfig,
        new_opening_fee: u64
    ) {
        cfg.opening_fee = new_opening_fee;
    }

    /// Deposit balance into Treasury (for external modules)
    public(package) fun deposit_to_treasury(treasury: &mut Treasury, fee_bal: balance::Balance<SUI>) {
        balance::join(&mut treasury.vault, fee_bal);
    }

    /// Withdraw from Treasury to recipient
    public fun withdraw_from_treasury(
        _admin: &AdminCap,
        treasury: &mut Treasury,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let available = balance::value(&treasury.vault);
        assert!(available >= amount, E_INSUFFICIENT_PAYMENT);
        let payout_bal = balance::split(&mut treasury.vault, amount);
        let payout_coin = coin::from_balance(payout_bal, ctx);
        transfer::public_transfer(payout_coin, recipient);
    }

    /// Withdraw Coin<SUI> for composing in same tx (returns coin)
    public fun withdraw_coin_for_integration(
        _admin: &AdminCap,
        treasury: &mut Treasury,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<SUI> {
        let available = balance::value(&treasury.vault);
        assert!(available >= amount, E_INSUFFICIENT_PAYMENT);
        let payout_bal = balance::split(&mut treasury.vault, amount);
        coin::from_balance(payout_bal, ctx)
    }

    /// Manual commission split and transfer
    public(package) fun process_commission_payment(
        payment: Coin<SUI>,
        commission_amount: u64,
        commission_recipient: address,
        ctx: &mut TxContext
    ): Option<Coin<SUI>> {
        utils::split_payment_and_transfer(payment, commission_amount, commission_recipient, ctx)
    }


    /// Read opening fee
    public fun opening_fee(cfg: &PlatformConfig): u64 { cfg.opening_fee }
    
    // == Test-Only Functions ==

    #[test_only]
    public fun test_init(otw: PLATFORM, ctx: &mut TxContext) {
        init(otw, ctx)
    }
}
