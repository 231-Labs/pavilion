module pavilion::platform {
    use sui::{
        coin::{Self, Coin},
        sui::SUI,
        transfer_policy::{Self, TransferPolicy, TransferPolicyCap, TransferRequest},
        package::{Self, Publisher},
    };

    // == Structs ==

    /// One-time witness for package initialization
    public struct PLATFORM has drop {}

    /// Admin capability for platform management
    public struct AdminCap has key, store {
        id: UID,
    }

    // == TransferPolicy Structures (for future use) ==

    /// Platform Commission Rule for TransferPolicy (reserved for future TransferPolicy integration)
    public struct PlatformCommissionRule has store, drop {}
    
    /// Commission Receipt - proves commission was paid (reserved for future use)
    public struct CommissionReceipt has drop {}

    // == Constants ==

    /// Commission rate constants (in basis points, 1 bp = 0.01%)
    const MAX_COMMISSION_RATE: u64 = 1000; // Maximum 10% commission
    const DEFAULT_COMMISSION_RATE: u64 = 250; // Default 2.5% commission
    const BASIS_POINTS_DENOMINATOR: u64 = 10000; // 100% = 10000 bp
    
    // Error codes
    #[error] const E_INVALID_COMMISSION_RATE: u8 = 0;
    #[error] const E_INSUFFICIENT_PAYMENT: u8 = 1;

    // == Module Initialization ==

    /// Module initializer with Publisher setup for TransferPolicy creation
    /// Creates AdminCap and sets up Publisher for policy creation
    fun init(otw: PLATFORM, ctx: &mut TxContext) {
        // Claim the package Publisher for creating TransferPolicies
        let publisher = package::claim(otw, ctx);
        
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        
        // Transfer AdminCap to deployer
        transfer::public_transfer(admin_cap, ctx.sender());
        
        // Transfer Publisher to deployer so they can create TransferPolicies
        transfer::public_transfer(publisher, ctx.sender());
    }

    /// Initialize TransferPolicy for a specific NFT type during deployment
    /// This can be called immediately after deploying both platform and NFT contracts
    /// Each NFT collection needs its own TransferPolicy due to Sui's type system
    public fun init_nft_transfer_policy<T>(
        admin_cap: &AdminCap,
        nft_publisher: &Publisher, // NFT 合約的 Publisher
        ctx: &mut TxContext
    ): ID {
        deploy_platform_policy<T>(admin_cap, nft_publisher, ctx)
    }

    // == TransferPolicy Functions ==

    /// Create a platform TransferPolicy (simplified)
    /// Rules need to be added separately due to TransferPolicy complexity
    public fun create_platform_transfer_policy<T>(
        _: &AdminCap,
        publisher: &Publisher,
        ctx: &mut TxContext
    ): (TransferPolicy<T>, TransferPolicyCap<T>) {
        // Create a basic TransferPolicy
        // Platform-specific commission rules can be added later
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
        
        // Share the policy for public use
        transfer::public_share_object(policy);
        
        // Keep policy cap for future rule updates
        transfer::public_transfer(policy_cap, ctx.sender());
        
        policy_id
    }

    // == Commission Calculation Functions ==

    /// Calculate platform commission for a given amount
    /// Use this to calculate commission before purchase
    public fun calculate_platform_commission(
        amount: u64,
        commission_rate_bp: u64
    ): u64 {
        assert!(commission_rate_bp <= MAX_COMMISSION_RATE, E_INVALID_COMMISSION_RATE);
        (amount * commission_rate_bp) / BASIS_POINTS_DENOMINATOR
    }

    /// Process commission payment manually (for custom implementations)
    /// This function handles the commission split and transfer
    public fun process_commission_payment(
        mut payment: Coin<SUI>,
        commission_amount: u64,
        commission_recipient: address,
        ctx: &mut TxContext
    ): Option<Coin<SUI>> {
        assert!(coin::value(&payment) >= commission_amount, E_INSUFFICIENT_PAYMENT);
        
        if (commission_amount > 0) {
            if (coin::value(&payment) > commission_amount) {
                // Split exact commission amount and return change
                let commission_coin = coin::split(&mut payment, commission_amount, ctx);
                transfer::public_transfer(commission_coin, commission_recipient);
                option::some(payment) // Return change
            } else {
                transfer::public_transfer(payment, commission_recipient);
                option::none() // No change to return
            }
        } else {
            // No commission needed, return full payment
            option::some(payment)
        }
    }

    /// Pay platform commission and add a receipt so confirm_request can succeed
    /// Call this right before transfer_policy::confirm_request
    public fun pay_commission_and_add_receipt<T>(
        _policy: &TransferPolicy<T>,
        transfer_request: &mut TransferRequest<T>,
        commission_payment: Coin<SUI>,
        commission_recipient: address
    ) {
        // Send commission to recipient
        transfer::public_transfer(commission_payment, commission_recipient);
        // Mark that PlatformCommissionRule was satisfied for this request
        transfer_policy::add_receipt(PlatformCommissionRule {}, transfer_request);
    }

    // == Utility Functions ==

    /// Calculate commission for a given amount and rate
    public fun calculate_commission_with_rate(amount: u64, rate_bp: u64): u64 {
        (amount * rate_bp) / BASIS_POINTS_DENOMINATOR
    }

    /// Get default commission rate
    public fun default_commission_rate(): u64 {
        DEFAULT_COMMISSION_RATE
    }

    /// Get maximum allowed commission rate  
    public fun max_commission_rate(): u64 {
        MAX_COMMISSION_RATE
    }

    // == Test-Only Functions ==

    #[test_only]
    public fun test_init(otw: PLATFORM, ctx: &mut TxContext) {
        init(otw, ctx)
    }
}
