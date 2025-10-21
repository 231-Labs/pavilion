module pavilion::platform {
    use sui::{
        coin::{Self, Coin},
        sui::SUI,
        transfer_policy::{Self, TransferPolicy, TransferPolicyCap, TransferRequest},
        package::{Self, Publisher},
        dynamic_field as df,
    };
    use pavilion::constants;

    // == Structs ==

    public struct PLATFORM has drop {}

    public struct AdminCap has key, store {
        id: UID,
    }
    
    public struct PlatformConfig has key {
        id: UID,
    }
    
    public struct CreationFeeKey has copy, store, drop {}

    // TransferPolicy structures (for future use)
    public struct PlatformCommissionRule has store, drop {}
    public struct CommissionReceipt has drop {}

    // == Constants ==

    const DEFAULT_COMMISSION_RATE: u64 = 250; // 2.5%
    const DEFAULT_CREATION_FEE: u64 = 1_000_000_000; // 1 SUI
    const MAX_CREATION_FEE: u64 = 100_000_000_000; // 100 SUI
    
    #[error] const E_INVALID_COMMISSION_RATE: u8 = 0;
    #[error] const E_INSUFFICIENT_PAYMENT: u8 = 1;
    #[error] const E_INVALID_CREATION_FEE: u8 = 2;

    // == Initialization ==

    fun init(otw: PLATFORM, ctx: &mut TxContext) {
        let publisher = package::claim(otw, ctx);
        
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        
        let mut config = PlatformConfig {
            id: object::new(ctx),
        };
        df::add(&mut config.id, CreationFeeKey {}, DEFAULT_CREATION_FEE);
        
        transfer::public_transfer(admin_cap, ctx.sender());
        transfer::share_object(config);
        transfer::public_transfer(publisher, ctx.sender());
    }

    /// Initialize TransferPolicy for specific NFT type
    public fun init_nft_transfer_policy<T>(
        admin_cap: &AdminCap,
        nft_publisher: &Publisher,
        ctx: &mut TxContext
    ): ID {
        deploy_platform_policy<T>(admin_cap, nft_publisher, ctx)
    }

    // == TransferPolicy ==

    public fun create_platform_transfer_policy<T>(
        _: &AdminCap,
        publisher: &Publisher,
        ctx: &mut TxContext
    ): (TransferPolicy<T>, TransferPolicyCap<T>) {
        transfer_policy::new<T>(publisher, ctx)
    }

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

    // == Commission ==

    public fun calculate_platform_commission(
        amount: u64,
        commission_rate_bp: u64
    ): u64 {
        assert!(commission_rate_bp <= constants::max_fee_bps(), E_INVALID_COMMISSION_RATE);
        (amount * commission_rate_bp) / constants::basis_points()
    }

    public fun process_commission_payment(
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

    public fun pay_commission_and_add_receipt<T>(
        _policy: &TransferPolicy<T>,
        transfer_request: &mut TransferRequest<T>,
        commission_payment: Coin<SUI>,
        commission_recipient: address
    ) {
        transfer::public_transfer(commission_payment, commission_recipient);
        transfer_policy::add_receipt(PlatformCommissionRule {}, transfer_request);
    }

    // == Creation Fee ==

    public fun set_creation_fee(
        _: &AdminCap,
        config: &mut PlatformConfig,
        new_fee: u64
    ) {
        assert!(new_fee <= MAX_CREATION_FEE, E_INVALID_CREATION_FEE);
        
        if (df::exists_(&config.id, CreationFeeKey {})) {
            *df::borrow_mut(&mut config.id, CreationFeeKey {}) = new_fee;
        } else {
            df::add(&mut config.id, CreationFeeKey {}, new_fee);
        };
    }

    public fun get_creation_fee(config: &PlatformConfig): u64 {
        if (df::exists_(&config.id, CreationFeeKey {})) {
            *df::borrow(&config.id, CreationFeeKey {})
        } else {
            DEFAULT_CREATION_FEE
        }
    }

    public fun collect_creation_fee(
        config: &PlatformConfig,
        payment: Coin<SUI>,
        platform_recipient: address,
    ): bool {
        let fee_amount = get_creation_fee(config);
        
        if (fee_amount == 0) {
            transfer::public_transfer(payment, platform_recipient);
            false
        } else {
            assert!(coin::value(&payment) >= fee_amount, E_INSUFFICIENT_PAYMENT);
            transfer::public_transfer(payment, platform_recipient);
            true
        }
    }

    // == Utilities ==

    public fun calculate_commission_with_rate(amount: u64, rate_bp: u64): u64 {
        (amount * rate_bp) / constants::basis_points()
    }

    public fun default_commission_rate(): u64 {
        DEFAULT_COMMISSION_RATE
    }

    public fun max_commission_rate(): u64 {
        constants::max_fee_bps()
    }
    
    public fun default_creation_fee(): u64 {
        DEFAULT_CREATION_FEE
    }
    
    public fun max_creation_fee(): u64 {
        MAX_CREATION_FEE
    }

    // == Test ==

    #[test_only]
    public fun test_init(otw: PLATFORM, ctx: &mut TxContext) {
        init(otw, ctx)
    }
    
    #[test_only]
    public fun create_test_config(ctx: &mut TxContext): PlatformConfig {
        let mut config = PlatformConfig {
            id: object::new(ctx),
        };
        df::add(&mut config.id, CreationFeeKey {}, DEFAULT_CREATION_FEE);
        config
    }
    
    #[test_only]
    public fun create_test_admin_cap(ctx: &mut TxContext): AdminCap {
        AdminCap {
            id: object::new(ctx),
        }
    }
}
