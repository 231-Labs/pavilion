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
    const MAX_NAME_LENGTH: u64 = 20;
    const MIN_NAME_LENGTH: u64 = 1;
    
    // Commission constants moved to platform module
    
    // Error codes
    #[error] const E_INVALID_NAME_LENGTH: u8 = 0;
    #[error] const E_NOT_PAVILION: u8 = 1;

    // == Public Functions ==

    /// Init: share PavilionExtensionObject so frontends can detect availability
    #[allow(lint(share_owned))]
    fun init(_otw: PAVILION, ctx: &mut TxContext) {
        let obj = PavilionExtensionObject { id: object::new(ctx) };
        transfer::public_share_object(obj);
    }
    
    /// Purchase with policy commission
    public(package) fun purchase_with_policy_commission<T: key + store>(
        kiosk: &mut Kiosk,
        item_id: ID,
        payment: Coin<SUI>,
        policy: &TransferPolicy<T>,
        commission_payment: Coin<SUI>,
        commission_recipient: address,
        _ctx: &mut TxContext
    ): T {
        // 1) Kiosk purchase
        let (nft, mut transfer_request) = kiosk::purchase<T>(kiosk, item_id, payment);
        // 2) Pay commission and add receipt for PlatformCommissionRule
        platform::pay_commission_and_add_receipt(
            policy,
            &mut transfer_request,
            commission_payment,
            commission_recipient
        );
        // 3) Confirm policy (now that receipt exists)
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
        platform::pay_opening_fee(cfg, treasury, payment, ctx);

        // If already a pavilion, just update name
        if (is_pavilion_kiosk(kiosk)) {
            set_dynamic_field(kiosk, cap, PavilionName {}, name);
        } else {
            // New pavilion: install extension and set name
            kiosk_extension::add(PavilionExtension {}, kiosk, cap, PAVILION_PERMISSIONS, ctx);
            set_dynamic_field(kiosk, cap, PavilionName {}, name);
        };
    }

    /// Update pavilion name
    public fun update_pavilion_name(self: &mut Kiosk, cap: &KioskOwnerCap, name: String) {
        // Ensure pavilion kiosk
        assert_is_pavilion_kiosk(self);
        
        // Validate name
        validate_pavilion_name(&name);
        
        set_dynamic_field(self, cap, PavilionName {}, name);
    }

    /// Set scene config blob ID
    public fun set_scene_config(self: &mut Kiosk, cap: &KioskOwnerCap, config: String) {
        // Ensure pavilion kiosk
        assert_is_pavilion_kiosk(self);
        
        set_dynamic_field(self, cap, SceneConfig {}, config);
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


    // == Private Functions ==

    /// Validate name length
    fun validate_pavilion_name(name: &String) {
        assert!(string::length(name) > MIN_NAME_LENGTH, E_INVALID_NAME_LENGTH);
        assert!(string::length(name) <= MAX_NAME_LENGTH, E_INVALID_NAME_LENGTH);
    }

    /// Set or update a dynamic field
    fun set_dynamic_field<K: copy + store + drop, V: store + drop>(
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
}
