/// Module: pavilion
module pavilion::pavilion {
    use std::string::{Self, String};
    use sui::{
        dynamic_field as df,
        kiosk::{Kiosk, KioskOwnerCap},
        kiosk_extension,
        transfer_policy
    };

    // == Structs ==

    /// Dynamic field key for pavilion name
    public struct PavilionName has copy, store, drop {}

    /// Dynamic field key for scene configuration blob ID
    public struct SceneConfig has copy, store, drop {}

    /// Dynamic field key for scene manager address
    public struct SceneManager has copy, store, drop {}

    /// Pavilion extension witness
    public struct PavilionExtension has drop {}

    /// Permission to manage scene objects (place, list, delist)
    public struct SceneManagerCap has key, store {
        id: UID,
        kiosk_id: ID,
        owner: address,
    }

    // == Constants ==

    /// Permission bitmap: place (1) + lock (2) = 3
    const PAVILION_PERMISSIONS: u128 = 3;
    const MAX_NAME_LENGTH: u64 = 20;
    const MIN_NAME_LENGTH: u64 = 1;
    
    // Error codes
    const E_INVALID_NAME_LENGTH: u64 = 0;
    const E_NOT_PAVILION: u64 = 1;
    const E_INVALID_KIOSK_ID: u64 = 2;
    const E_UNAUTHORIZED_MANAGER: u64 = 3;


    // == Kiosk Owner Functions ==
    
    /// Initialize pavilion functionality on an existing kiosk
    /// If already a pavilion, will update the name and scene manager
    /// Creates and transfers SceneManagerCap to the specified manager
    public fun initialize_pavilion(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        name: String,
        manager_address: address,
        ctx: &mut TxContext
    ) { 
        // Validate name length
        validate_pavilion_name(&name);
        
        // Check if this is the first time setting up pavilion
        let is_new_pavilion = !df::exists_(kiosk.uid(), PavilionName {});
        
        // Set/update pavilion fields using helper functions
        set_dynamic_field(kiosk, cap, PavilionName {}, name);
        set_dynamic_field(kiosk, cap, SceneManager {}, manager_address);
        
        // Install extension only for new pavilions
        if (is_new_pavilion) {
            kiosk_extension::add(PavilionExtension {}, kiosk, cap, PAVILION_PERMISSIONS, ctx);
        };
        
        // Create and transfer scene manager capability
        let manager_cap = SceneManagerCap {
            id: object::new(ctx),
            kiosk_id: object::id(kiosk),
            owner: manager_address,
        };
        
        transfer::public_transfer(manager_cap, manager_address);
    }

    /// Kiosk owner can revoke scene manager by removing authorization
    /// This makes ALL existing SceneManagerCaps for this kiosk invalid
    entry fun revoke_scene_manager_by_owner(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
    ) {
        ensure_is_pavilion(kiosk);
        
        // Remove the scene manager authorization entirely
        // This invalidates ALL existing SceneManagerCaps for this kiosk
        df::remove<SceneManager, address>(kiosk.uid_mut_as_owner(cap), SceneManager {});
    }

    /// Replace scene manager and invalidate all old caps (one-step operation)
    entry fun replace_scene_manager(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        new_manager: address,
        ctx: &mut TxContext
    ) {
        ensure_is_pavilion(kiosk);
        
        // First revoke all existing manager caps by updating the dynamic field
        set_dynamic_field(kiosk, cap, SceneManager {}, new_manager);
        
        // Create new capability for the new manager
        let new_manager_cap = SceneManagerCap {
            id: object::new(ctx),
            kiosk_id: object::id(kiosk),
            owner: new_manager,
        };
        
        transfer::public_transfer(new_manager_cap, new_manager);
    }

    /// Update pavilion name
    public fun update_pavilion_name(self: &mut Kiosk, cap: &KioskOwnerCap, name: String) {
        // Validate name length
        validate_pavilion_name(&name);
        
        set_dynamic_field(self, cap, PavilionName {}, name);
    }

    /// Set scene configuration blob ID (points to Walrus storage)
    public fun set_scene_config(self: &mut Kiosk, cap: &KioskOwnerCap, config: String) {
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
        if (df::exists_(self.uid(), SceneManager {})) {
            let _manager: address = df::remove(self.uid_mut_as_owner(cap), SceneManager {});
        };
    }

    // == Scene Manager Functions ==

    /// Scene manager can place items using extension permissions
    entry fun scene_manager_place<T: key + store>(
        kiosk: &mut Kiosk,
        manager_cap: &SceneManagerCap,
        item: T,
        policy: &transfer_policy::TransferPolicy<T>,
        ctx: &TxContext
    ) {
        // Verify permissions
        verify_scene_manager_permission(kiosk, manager_cap, ctx);

        // Use extension permissions to place item
        kiosk_extension::place(PavilionExtension {}, kiosk, item, policy);
    }

    /// Scene manager can lock items for display (prevents removal by owner)
    /// This is useful for important exhibition pieces that should stay in the pavilion
    entry fun scene_manager_lock<T: key + store>(
        kiosk: &mut Kiosk,
        manager_cap: &SceneManagerCap,
        item: T,
        policy: &transfer_policy::TransferPolicy<T>,
        ctx: &TxContext
    ) {
        // Verify permissions
        verify_scene_manager_permission(kiosk, manager_cap, ctx);

        // Use extension permissions to lock item (also places it)
        kiosk_extension::lock(PavilionExtension {}, kiosk, item, policy);
    }

    /// Scene manager can voluntarily give up their capability
    entry fun revoke_scene_manager_cap(manager_cap: SceneManagerCap) {
        // Simply destroy the capability to revoke permissions
        let SceneManagerCap { id, kiosk_id: _, owner: _ } = manager_cap;
        object::delete(id);
    }


    // == Read-Only Query Functions ==

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

    /// Check if kiosk is a pavilion
    public fun is_pavilion(self: &Kiosk): bool {
        df::exists_(self.uid(), PavilionName {})
    }

    /// Get the current scene manager
    public fun get_scene_manager(kiosk: &Kiosk): Option<address> {
        if (df::exists_(kiosk.uid(), SceneManager {})) {
            option::some(*df::borrow(kiosk.uid(), SceneManager {}))
        } else {
            option::none()
        }
    }

    // == Internal Helper Functions ==

    /// Validate pavilion name length
    fun validate_pavilion_name(name: &String) {
        assert!(string::length(name) > MIN_NAME_LENGTH, E_INVALID_NAME_LENGTH);
        assert!(string::length(name) <= MAX_NAME_LENGTH, E_INVALID_NAME_LENGTH);
    }

    /// Ensure the kiosk is a pavilion
    fun ensure_is_pavilion(kiosk: &Kiosk) {
        assert!(is_pavilion(kiosk), E_NOT_PAVILION);
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

    /// Verify scene manager capability and permissions
    fun verify_scene_manager_permission(
        kiosk: &Kiosk,
        manager_cap: &SceneManagerCap,
        ctx: &TxContext
    ) {
        // Verify the manager cap is for this kiosk
        assert!(manager_cap.kiosk_id == object::id(kiosk), E_INVALID_KIOSK_ID);
        
        // Verify manager is authorized
        if (df::exists_(kiosk.uid(), SceneManager {})) {
            let scene_manager: &address = df::borrow(kiosk.uid(), SceneManager {});
            assert!(
                *scene_manager == manager_cap.owner || 
                manager_cap.owner == ctx.sender(),
                E_UNAUTHORIZED_MANAGER
            );
        };
    }
}
