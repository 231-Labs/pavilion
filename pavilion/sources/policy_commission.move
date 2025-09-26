module pavilion::policy_commission {
    use sui::{
        coin::{Self, Coin},
        sui::SUI,
        transfer_policy::{Self, TransferPolicy, TransferPolicyCap, TransferRequest},
        package::Publisher,
    };
    use pavilion::platform::AdminCap;

    // == TransferPolicy Structures ==

    /// Commission rule tag for policies
    public struct PlatformCommissionRule has store, drop {}
    
    /// Platform commission configuration
    public struct PlatformCommissionConfig has store, drop {
        platform_treasury: address,
        commission_rate_bp: u64, // basis points
    }

    // == Constants ==

    /// Commission in basis points (1 bp = 0.01%)
    const MAX_COMMISSION_RATE: u64 = 1000; // 10%
    const BASIS_POINTS_DENOMINATOR: u64 = 10000; // 100%
    
    // Error codes
    #[error] const E_INVALID_COMMISSION_RATE: u8 = 0;
    #[error] const E_INSUFFICIENT_PAYMENT: u8 = 1;

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

    /// Deploy a TransferPolicy for an NFT type
    public fun init_nft_transfer_policy<T>(
        admin_cap: &AdminCap,
        nft_publisher: &Publisher,
        ctx: &mut TxContext
    ): ID {
        deploy_platform_policy<T>(admin_cap, nft_publisher, ctx)
    }

    // == Commission Rule Functions ==

    /// Add platform commission rule to TransferPolicy
    public fun add_platform_commission_rule<T>(
        _admin_cap: &AdminCap,
        policy: &mut TransferPolicy<T>,
        policy_cap: &TransferPolicyCap<T>,
        platform_treasury_addr: address,
        commission_rate_bp: u64
    ) {
        assert!(commission_rate_bp <= MAX_COMMISSION_RATE, E_INVALID_COMMISSION_RATE);
        
        let config = PlatformCommissionConfig {
            platform_treasury: platform_treasury_addr,
            commission_rate_bp,
        };
        
        transfer_policy::add_rule<T, PlatformCommissionRule, PlatformCommissionConfig>(
            PlatformCommissionRule {},
            policy,
            policy_cap,
            config
        );
    }

    /// Pay platform commission and add receipt (enforced by TransferPolicy)
    public fun pay_platform_commission_and_add_receipt<T>(
        policy: &TransferPolicy<T>,
        transfer_request: &mut TransferRequest<T>,
        commission_payment: Coin<SUI>
    ) {
        // Get commission configuration from policy
        let config = transfer_policy::get_rule<T, PlatformCommissionRule, PlatformCommissionConfig>(
            PlatformCommissionRule {},
            policy
        );
        
        // Verify payment amount matches required commission
        let paid_amount = coin::value(&commission_payment);
        let item_price = transfer_policy::paid<T>(transfer_request);
        let required_commission = calculate_platform_commission(item_price, config.commission_rate_bp);
        
        assert!(paid_amount >= required_commission, E_INSUFFICIENT_PAYMENT);
        
        // Transfer commission to platform treasury
        transfer::public_transfer(commission_payment, config.platform_treasury);
        
        // Add receipt to prove commission was paid
        transfer_policy::add_receipt<T, PlatformCommissionRule>(
            PlatformCommissionRule {},
            transfer_request
        );
    }

    /// Calculate required platform commission for a TransferPolicy
    public fun calculate_required_platform_commission<T>(
        policy: &TransferPolicy<T>,
        item_price: u64
    ): u64 {
        let config = transfer_policy::get_rule<T, PlatformCommissionRule, PlatformCommissionConfig>(
            PlatformCommissionRule {},
            policy
        );
        calculate_platform_commission(item_price, config.commission_rate_bp)
    }

    // == Commission Calculation Functions ==

    /// Calculate commission amount
    fun calculate_platform_commission(
        amount: u64,
        commission_rate_bp: u64
    ): u64 {
        assert!(commission_rate_bp <= MAX_COMMISSION_RATE, E_INVALID_COMMISSION_RATE);
        (amount * commission_rate_bp) / BASIS_POINTS_DENOMINATOR
    }

    // == Utility Functions ==

    /// Get platform treasury address from policy
    public fun get_platform_treasury_address<T>(policy: &TransferPolicy<T>): address {
        let config = transfer_policy::get_rule<T, PlatformCommissionRule, PlatformCommissionConfig>(
            PlatformCommissionRule {},
            policy
        );
        config.platform_treasury
    }

    /// Get commission rate from policy
    public fun get_commission_rate<T>(policy: &TransferPolicy<T>): u64 {
        let config = transfer_policy::get_rule<T, PlatformCommissionRule, PlatformCommissionConfig>(
            PlatformCommissionRule {},
            policy
        );
        config.commission_rate_bp
    }

    /// Check if policy has platform commission rule
    public fun has_platform_commission_rule<T>(policy: &TransferPolicy<T>): bool {
        transfer_policy::has_rule<T, PlatformCommissionRule>(policy)
    }
}
