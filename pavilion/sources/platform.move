module pavilion::platform {
    use sui::{
        coin::{Self, Coin},
        sui::SUI,
        transfer_policy::{Self, TransferPolicy, TransferPolicyCap, TransferRequest},
        package::{Self, Publisher},
        balance,
    };

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

    // == TransferPolicy Structures (for future use) ==

    /// Commission rule tag for policies
    public struct PlatformCommissionRule has store, drop {}
    
    /// Receipt tag that fee was paid
    public struct CommissionReceipt has drop {}

    // == Constants ==

    /// Commission in basis points (1 bp = 0.01%)
    const MAX_COMMISSION_RATE: u64 = 1000; // 10%
    const DEFAULT_COMMISSION_RATE: u64 = 250; // 2.5%
    const BASIS_POINTS_DENOMINATOR: u64 = 10000; // 100%
    const INITIAL_OPENING_FEE: u64 = 10_000_000; // 0.01 SUI (in MIST)
    
    // Error codes
    #[error] const E_INVALID_COMMISSION_RATE: u8 = 0;
    #[error] const E_INSUFFICIENT_PAYMENT: u8 = 1;

    // == Module Initialization ==

    /// Init: create AdminCap and claim Publisher
    #[allow(lint(share_owned))]
    fun init(otw: PLATFORM, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);
        let admin_cap = AdminCap { id: object::new(ctx) };
        let cfg = create_platform_config(&admin_cap, INITIAL_OPENING_FEE, ctx);
        let treasury = create_treasury(&admin_cap, ctx);

        transfer::public_share_object(cfg);
        transfer::public_share_object(treasury);
        transfer::public_transfer(admin_cap, ctx.sender());
        transfer::public_transfer(publisher, ctx.sender());
    }

    /// Deploy a TransferPolicy for an NFT type
    public fun init_nft_transfer_policy<T>(
        admin_cap: &AdminCap,
        nft_publisher: &Publisher,
        ctx: &mut TxContext
    ): ID {
        deploy_platform_policy<T>(admin_cap, nft_publisher, ctx)
    }

    // == TransferPolicy Functions ==

    /// Create a basic TransferPolicy
    fun create_platform_transfer_policy<T>(
        _: &AdminCap,
        publisher: &Publisher,
        ctx: &mut TxContext
    ): (TransferPolicy<T>, TransferPolicyCap<T>) {
        transfer_policy::new<T>(publisher, ctx)
    }


    /// Create and share a platform TransferPolicy
    #[allow(lint(share_owned), lint(self_transfer))]
    public fun deploy_platform_policy<T>(
        admin_cap: &AdminCap,
        publisher: &Publisher,
        ctx: &mut TxContext
    ): ID {
        let (policy, policy_cap) = create_platform_transfer_policy<T>(
            admin_cap,
            publisher,
            ctx
        );
        
        let policy_id = object::id(&policy);
        transfer::public_share_object(policy);
        transfer::public_transfer(policy_cap, ctx.sender());
        
        policy_id
    }

    // == Commission Calculation Functions ==

    /// Calculate commission amount
    public(package) fun calculate_platform_commission(
        amount: u64,
        commission_rate_bp: u64
    ): u64 {
        assert!(commission_rate_bp <= MAX_COMMISSION_RATE, E_INVALID_COMMISSION_RATE);
        (amount * commission_rate_bp) / BASIS_POINTS_DENOMINATOR
    }

    // == Platform Opening Fee Config ==

    /// Create and share PlatformConfig
    public fun create_platform_config(
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
    public(package) fun update_opening_fee(
        _admin: &AdminCap,
        cfg: &mut PlatformConfig,
        new_opening_fee: u64
    ) {
        cfg.opening_fee = new_opening_fee;
    }

    /// Read opening fee
    public(package) fun opening_fee(cfg: &PlatformConfig): u64 { cfg.opening_fee }

    /// Split payment into (fee balance, optional change)
    fun collect_opening_fee(
        cfg: &PlatformConfig,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext
    ): (balance::Balance<SUI>, Option<Coin<SUI>>) {
        let fee = cfg.opening_fee;
        if (fee == 0) {
            (balance::zero<SUI>(), option::some(payment))
        } else {
            let paid = coin::value(&payment);
            assert!(paid >= fee, E_INSUFFICIENT_PAYMENT);
            if (paid == fee) {
                (coin::into_balance(payment), option::none())
            } else {
                let fee_coin = coin::split(&mut payment, fee, ctx);
                (coin::into_balance(fee_coin), option::some(payment))
            }
        }
    }

    /// Deposit fee balance into Treasury
    fun deposit_opening_fee(treasury: &mut Treasury, fee_bal: balance::Balance<SUI>) {
        balance::join(&mut treasury.vault, fee_bal);
    }

    /// Return change to sender
    #[allow(lint(self_transfer))]
    fun return_change_to_sender(change: Coin<SUI>, ctx: &TxContext) {
        transfer::public_transfer(change, ctx.sender());
    }

    /// Helper: collect, deposit, return change
    public(package) fun pay_opening_fee(
        cfg: &PlatformConfig,
        treasury: &mut Treasury,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let (fee_bal, change_opt) = collect_opening_fee(cfg, payment, ctx);
        deposit_opening_fee(treasury, fee_bal);
        if (option::is_some(&change_opt)) {
            let change = option::destroy_some(change_opt);
            return_change_to_sender(change, ctx);
        } else {
            option::destroy_none(change_opt);
        }
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
        mut payment: Coin<SUI>,
        commission_amount: u64,
        commission_recipient: address,
        ctx: &mut TxContext
    ): Option<Coin<SUI>> {
        assert!(coin::value(&payment) >= commission_amount, E_INSUFFICIENT_PAYMENT);
        
        if (commission_amount > 0) {
            if (coin::value(&payment) > commission_amount) {
                let commission_coin = coin::split(&mut payment, commission_amount, ctx);
                transfer::public_transfer(commission_coin, commission_recipient);
                option::some(payment)
            } else {
                transfer::public_transfer(payment, commission_recipient);
                option::none()
            }
        } else {
            option::some(payment)
        }
    }

    /// Pay commission and add receipt (for policy confirm)
    public(package) fun pay_commission_and_add_receipt<T>(
        _policy: &TransferPolicy<T>,
        transfer_request: &mut TransferRequest<T>,
        commission_payment: Coin<SUI>,
        commission_recipient: address
    ) {
        transfer::public_transfer(commission_payment, commission_recipient);
        transfer_policy::add_receipt(PlatformCommissionRule {}, transfer_request);
    }

    // == Utility Functions ==

    /// Calculate commission by rate
    public(package) fun calculate_commission_with_rate(amount: u64, rate_bp: u64): u64 {
        (amount * rate_bp) / BASIS_POINTS_DENOMINATOR
    }

    /// Default commission rate
    public(package) fun default_commission_rate(): u64 {
        DEFAULT_COMMISSION_RATE
    }

    /// Max commission rate
    public(package) fun max_commission_rate(): u64 {
        MAX_COMMISSION_RATE
    }

    // == Test-Only Functions ==

    #[test_only]
    public fun test_init(otw: PLATFORM, ctx: &mut TxContext) {
        init(otw, ctx)
    }
}
