/// Module: pavilion - User-level pavilion functionality
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

    /// Dynamic field key for pavilion name
    public struct PavilionName has copy, store, drop {}

    /// Dynamic field key for scene configuration blob ID
    public struct SceneConfig has copy, store, drop {}

    /// Pavilion extension witness
    public struct PavilionExtension has drop {}


    // == Constants ==

    const PAVILION_PERMISSIONS: u128 = 3;
    const MAX_NAME_LENGTH: u64 = 20;
    const MIN_NAME_LENGTH: u64 = 1;
    
    // Commission-related constants moved to platform module
    
    // Error codes
    #[error] const E_INVALID_NAME_LENGTH: u8 = 0;
    #[error] const E_NOT_PAVILION: u8 = 1;

    // == Public Functions ==

    // == TransferPolicy Integration Examples ==
    
    /// Purchase with policy-enforced commission (confirm_request phase)
    /// Flow: purchase -> pay commission -> add receipt -> confirm_request
    public fun purchase_with_policy_commission<T: key + store>(
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
    
    /// Simple marketplace purchase - commission is enforced by TransferPolicy
    /// This function just executes the purchase and confirms the transfer policy
    public fun marketplace_purchase<T: key + store>(
        kiosk: &mut Kiosk,
        item_id: ID,
        payment: Coin<SUI>,
        transfer_policy: &TransferPolicy<T>,
        _ctx: &mut TxContext
    ): T {
        // 1. Execute kiosk purchase
        let (nft, transfer_request) = kiosk::purchase<T>(kiosk, item_id, payment);
        
        // 2. Confirm transfer policy (this will enforce commission via rules)
        transfer_policy::confirm_request(transfer_policy, transfer_request);
        
        nft
    }

    // Standard Kiosk Functions (Use platform TransferPolicy for commission enforcement)
    
    /// List an item in the pavilion kiosk
    /// Commission enforcement is handled by TransferPolicy during purchase
    public fun list_item<T: key + store>(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        item_id: ID,
        price: u64,
    ) {
        kiosk::list<T>(kiosk, cap, item_id, price);
    }

    /// Delist an item from pavilion kiosk
    public fun delist_item<T: key + store>(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        item_id: ID,
    ) {
        kiosk::delist<T>(kiosk, cap, item_id)
    }

    // Kiosk Management Functions
    
    /// Initialize pavilion functionality on an existing kiosk
    /// This function can be called multiple times - first call installs extension, subsequent calls update settings
    public fun initialize_pavilion(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        name: String,
        ctx: &mut TxContext
    ) { 
        // Validate name length
        validate_pavilion_name(&name);
        
        // Check if this kiosk already has pavilion extension installed
        if (is_pavilion_kiosk(kiosk)) {
            // This is already a pavilion kiosk, just update the name
            set_dynamic_field(kiosk, cap, PavilionName {}, name);
        } else {
            // This is a new pavilion, install extension and initialize everything
            kiosk_extension::add(PavilionExtension {}, kiosk, cap, PAVILION_PERMISSIONS, ctx);
            set_dynamic_field(kiosk, cap, PavilionName {}, name);
        };
    }

    /// Update pavilion name (only works on existing pavilion kiosks)
    public fun update_pavilion_name(self: &mut Kiosk, cap: &KioskOwnerCap, name: String) {
        // Ensure this is a pavilion kiosk
        assert_is_pavilion_kiosk(self);
        
        // Validate name length
        validate_pavilion_name(&name);
        
        set_dynamic_field(self, cap, PavilionName {}, name);
    }

    /// Set scene configuration blob ID (points to Walrus storage)
    /// Only works on pavilion kiosks
    public fun set_scene_config(self: &mut Kiosk, cap: &KioskOwnerCap, config: String) {
        // Ensure this is a pavilion kiosk
        assert_is_pavilion_kiosk(self);
        
        set_dynamic_field(self, cap, SceneConfig {}, config);
    }

    /// Remove pavilion functionality from kiosk
    public fun remove_pavilion(self: &mut Kiosk, cap: &KioskOwnerCap) {
        if (df::exists_(self.uid(), PavilionName {})) {
            let _name: String = df::remove(self.uid_mut_as_owner(cap), PavilionName {});
        };
        if (df::exists_(self.uid(), SceneConfig {})) {
            let _blob: String = df::remove(self.uid_mut_as_owner(cap), SceneConfig {});
        };
    }

    // Query Functions

    /// Check if a kiosk has pavilion extension installed
    /// This is crucial for the frontend to determine if the kiosk should be treated as a pavilion
    public fun is_pavilion_kiosk(kiosk: &Kiosk): bool {
        kiosk_extension::is_installed<PavilionExtension>(kiosk)
    }

    /// Verify that a kiosk is a pavilion kiosk (throws error if not)
    /// Use this in functions that require pavilion functionality
    public fun assert_is_pavilion_kiosk(kiosk: &Kiosk) {
        assert!(is_pavilion_kiosk(kiosk), E_NOT_PAVILION);
    }

    /// Get the name of the pavilion
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

    /// Get scene configuration blob ID
    public fun scene_config_blob(self: &Kiosk): Option<String> {
        if (df::exists_(self.uid(), SceneConfig {})) {
            option::some(*df::borrow(self.uid(), SceneConfig {}))
        } else {
            option::none()
        }
    }


    // == Private Functions ==

    /// Validate pavilion name length
    fun validate_pavilion_name(name: &String) {
        assert!(string::length(name) > MIN_NAME_LENGTH, E_INVALID_NAME_LENGTH);
        assert!(string::length(name) <= MAX_NAME_LENGTH, E_INVALID_NAME_LENGTH);
    }

    /// Generic function to set or update a dynamic field
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
