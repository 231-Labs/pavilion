/// Pavilion user-level features
module pavilion::pavilion {
    use std::string::{Self, String};
    use sui::{
        dynamic_field as df,
        kiosk::{Self, Kiosk, KioskOwnerCap},
        kiosk_extension,
        coin::{Coin},
        sui::SUI,
        transfer_policy::{Self, TransferPolicy},
    };
    use pavilion::platform;
    use pavilion::policy_commission;
    use pavilion::utils::{Self, validate_pavilion_name, set_kiosk_dynamic_field};

    // == Structs ==

    /// Package init witness
    public struct PAVILION has drop {}

    /// DF key: pavilion name
    public struct PavilionName has copy, store, drop {}

    /// DF key: scene config blob ID
    public struct SceneConfig has copy, store, drop {}

    /// Pavilion extension witness (for kiosk_extension)
    public struct PavilionExtension has drop {}

    /// Shared object to mark Pavilion extension availability
    public struct PavilionExtensionObject has key, store { id: UID }


    // == Constants ==

    const PAVILION_PERMISSIONS: u128 = 3;
    
    // Commission constants moved to platform module
    
    // Error codes
    #[error] const E_NOT_PAVILION: u8 = 1;

    // == Public Functions ==

    /// Init: share PavilionExtensionObject so frontends can detect availability
    #[allow(lint(share_owned))]
    fun init(_otw: PAVILION, ctx: &mut TxContext) {
        let obj = PavilionExtensionObject { id: object::new(ctx) };
        transfer::public_share_object(obj);
    }
    
    /// Purchase with enforced platform commission (prevents bypass)
    public fun marketplace_purchase_with_platform_commission<T: key + store>(
        kiosk: &mut Kiosk,
        item_id: ID,
        payment: Coin<SUI>,
        policy: &TransferPolicy<T>,
        commission_payment: Coin<SUI>,
        _ctx: &mut TxContext
    ): T {
        // 1) Execute kiosk purchase
        let (nft, mut transfer_request) = kiosk::purchase<T>(kiosk, item_id, payment);
        
        // 2) Pay platform commission (required by TransferPolicy rule)
        policy_commission::pay_platform_commission_and_add_receipt(
            policy,
            &mut transfer_request,
            commission_payment
        );
        
        // 3) Confirm transfer policy - this will FAIL if commission wasn't paid
        transfer_policy::confirm_request(policy, transfer_request);
        
        nft
    }

    // Simplified Transaction Functions (Legacy - commission now handled in TransferPolicy)
    
    /// Marketplace purchase (policy enforces commission)
    public(package) fun marketplace_purchase<T: key + store>(
        kiosk: &mut Kiosk,
        item_id: ID,
        payment: Coin<SUI>,
        transfer_policy: &TransferPolicy<T>,
    ): T {
        // 1. Execute kiosk purchase
        let (nft, transfer_request) = kiosk::purchase<T>(kiosk, item_id, payment);
        
        // 2. Confirm transfer policy (this will enforce commission via rules)
        transfer_policy::confirm_request(transfer_policy, transfer_request);
        
        nft
    }

    // Standard Kiosk Functions (Use platform TransferPolicy for commission enforcement)
    
    /// List item (commission via policy on purchase)
    public(package) fun list_item<T: key + store>(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        item_id: ID,
        price: u64,
    ) {
        kiosk::list<T>(kiosk, cap, item_id, price);
    }

    /// Delist item
    public(package) fun delist_item<T: key + store>(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        item_id: ID,
    ) {
        kiosk::delist<T>(kiosk, cap, item_id)
    }

    // Kiosk Management Functions
    
    /// Initialize pavilion on kiosk (requires platform fee)
    public fun initialize_pavilion(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        name: String,
        cfg: &platform::PlatformConfig,
        treasury: &mut platform::Treasury,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) { 
        // Validate name
        validate_pavilion_name(&name);
        
        // Charge opening fee
        pay_pavilion_opening_fee(cfg, treasury, payment, ctx);

        // If already a pavilion, just update name
        if (is_pavilion_kiosk(kiosk)) {
            set_kiosk_dynamic_field(kiosk, cap, PavilionName {}, name);
        } else {
            kiosk_extension::add(PavilionExtension {}, kiosk, cap, PAVILION_PERMISSIONS, ctx);
            set_kiosk_dynamic_field(kiosk, cap, PavilionName {}, name);
        };
    }

    /// Update pavilion name
    public fun update_pavilion_name(self: &mut Kiosk, cap: &KioskOwnerCap, name: String) {
        // Ensure pavilion kiosk
        assert_is_pavilion_kiosk(self);
        
        // Validate name
        validate_pavilion_name(&name);
        set_kiosk_dynamic_field(self, cap, PavilionName {}, name);
    }

    /// Set scene config
    public fun set_scene_config(self: &mut Kiosk, cap: &KioskOwnerCap, config: String) {
        // Ensure pavilion kiosk
        assert_is_pavilion_kiosk(self);
        set_kiosk_dynamic_field(self, cap, SceneConfig {}, config);
    }

    /// Remove pavilion data from kiosk
    public(package) fun remove_pavilion(self: &mut Kiosk, cap: &KioskOwnerCap) {
        if (df::exists_(self.uid(), PavilionName {})) {
            let _name: String = df::remove(self.uid_mut_as_owner(cap), PavilionName {});
        };
        if (df::exists_(self.uid(), SceneConfig {})) {
            let _blob: String = df::remove(self.uid_mut_as_owner(cap), SceneConfig {});
        };
    }

    // Query Functions

    /// Check if kiosk has pavilion extension
    public fun is_pavilion_kiosk(kiosk: &Kiosk): bool {
        kiosk_extension::is_installed<PavilionExtension>(kiosk)
    }

    /// Assert pavilion kiosk
    public(package) fun assert_is_pavilion_kiosk(kiosk: &Kiosk) {
        assert!(is_pavilion_kiosk(kiosk), E_NOT_PAVILION);
    }

    /// Get pavilion name
    public fun pavilion_name(self: &Kiosk): Option<String> {
        if (df::exists_(self.uid(), PavilionName {})) {
            let name = *df::borrow(self.uid(), PavilionName {});
            if (string::length(&name) == 0) {
                option::none()
            } else {
                option::some(name)
            }
        } else {
            option::none()
        }
    }

    /// Get scene config blob ID
    public fun scene_config_blob(self: &Kiosk): Option<String> {
        if (df::exists_(self.uid(), SceneConfig {})) {
            option::some(*df::borrow(self.uid(), SceneConfig {}))
        } else {
            option::none()
        }
    }

    // == Pavilion Opening Fee ==

    /// Pay opening fee to become a pavilion
    #[allow(lint(self_transfer))]
    fun pay_pavilion_opening_fee(
        cfg: &platform::PlatformConfig,
        treasury: &mut platform::Treasury,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let fee = platform::opening_fee(cfg);
        let (fee_balance, change_opt) = utils::split_payment_with_change(payment, fee, ctx);
        
        // Deposit fee to treasury
        platform::deposit_to_treasury(treasury, fee_balance);
        
        // Return change if any
        if (option::is_some(&change_opt)) {
            let change = option::destroy_some(change_opt);
            transfer::public_transfer(change, ctx.sender());
        } else {
            option::destroy_none(change_opt);
        }
    }
}
