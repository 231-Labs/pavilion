/// Module: pavilion - User-level pavilion functionality
module pavilion::pavilion {
    use std::string::{Self, String};
    use sui::{
        dynamic_field as df,
        kiosk::{Self, Kiosk, KioskOwnerCap},
        kiosk_extension,
        table::{Self},
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

    /// Dynamic field key for scene objects properties
    public struct SceneObjects has copy, store, drop {}

    /// Pavilion extension witness
    public struct PavilionExtension has drop {}

    /// Properties for a single object in the scene
    public struct ObjectProperties has store, drop, copy {
        displayed: bool,
        position: vector<u64>,
        rotation: vector<u64>,
        scale: u64,
        updated_at: u64,
    }

    /// Registry of all objects and their properties in the scene
    public struct SceneObjectRegistry has store {
        /// Map from object ID to properties
        objects: table::Table<ID, ObjectProperties>,
        /// Total number of objects
        count: u64,
    }

    // == Constants ==

    const PAVILION_PERMISSIONS: u128 = 3;
    const MAX_NAME_LENGTH: u64 = 20;
    const MIN_NAME_LENGTH: u64 = 1;
    
    // Commission-related constants moved to platform module
    
    // Error codes
    #[error] const E_INVALID_NAME_LENGTH: u8 = 0;
    #[error] const E_NOT_PAVILION: u8 = 1;
    #[error] const E_INVALID_VECTOR_SIZE: u8 = 2;
    #[error] const E_REGISTRY_NOT_INITIALIZED: u8 = 3;

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
            init_scene_object_registry(kiosk, cap, ctx);
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
        if (df::exists_(self.uid(), SceneObjects {})) {
            let SceneObjectRegistry { objects, count: _ } = df::remove(self.uid_mut_as_owner(cap), SceneObjects {});
            table::destroy_empty(objects);
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


    // Object Properties Functions

    /// Create default object properties
    public fun create_default_properties(ctx: &mut TxContext): ObjectProperties {
        ObjectProperties {
            displayed: true,
            position: vector[0, 0, 0],
            rotation: vector[0, 0, 0],
            scale: 1000, // Default scale of 1.0 (stored as 1000)
            updated_at: tx_context::epoch_timestamp_ms(ctx),
        }
    }

    /// Create object properties with specified values
    public fun create_object_properties(
        displayed: bool,
        position: vector<u64>,
        rotation: vector<u64>,
        scale: u64,
        ctx: &mut TxContext
    ): ObjectProperties {
        validate_vector3(&position);
        validate_vector3(&rotation);
        
        ObjectProperties {
            displayed,
            position,
            rotation,
            scale,
            updated_at: tx_context::epoch_timestamp_ms(ctx),
        }
    }

    /// Set properties for a specific object (requires kiosk owner cap)
    public fun set_object_properties(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        object_id: ID,
        displayed: bool,
        position: vector<u64>,
        rotation: vector<u64>,
        scale: u64,
        ctx: &mut TxContext
    ) {
        assert_is_pavilion_kiosk(kiosk);
        validate_vector3(&position);
        validate_vector3(&rotation);

        // Initialize registry if it doesn't exist
        if (!df::exists_(kiosk.uid(), SceneObjects {})) {
            init_scene_object_registry(kiosk, cap, ctx);
        };

        let registry: &mut SceneObjectRegistry = df::borrow_mut(kiosk.uid_mut_as_owner(cap), SceneObjects {});
        let properties = ObjectProperties {
            displayed,
            position,
            rotation,
            scale,
            updated_at: tx_context::epoch_timestamp_ms(ctx),
        };

        if (table::contains(&registry.objects, object_id)) {
            *table::borrow_mut(&mut registry.objects, object_id) = properties;
        } else {
            table::add(&mut registry.objects, object_id, properties);
            registry.count = registry.count + 1;
        };
    }

    /// Batch update multiple object properties at once
    /// Each update contains object_id and its new properties
    public fun batch_update_object_properties(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        object_ids: vector<ID>,
        properties_list: vector<ObjectProperties>,
        ctx: &mut TxContext
    ) {
        assert_is_pavilion_kiosk(kiosk);
        assert!(vector::length(&object_ids) == vector::length(&properties_list), E_INVALID_VECTOR_SIZE);

        // Initialize registry if it doesn't exist
        if (!df::exists_(kiosk.uid(), SceneObjects {})) {
            init_scene_object_registry(kiosk, cap, ctx);
        };

        let registry: &mut SceneObjectRegistry = df::borrow_mut(kiosk.uid_mut_as_owner(cap), SceneObjects {});
        let mut i = 0;
        let len = vector::length(&object_ids);

        while (i < len) {
            let object_id = *vector::borrow(&object_ids, i);
            let properties = *vector::borrow(&properties_list, i);
            
            validate_vector3(&properties.position);
            validate_vector3(&properties.rotation);

            if (table::contains(&registry.objects, object_id)) {
                *table::borrow_mut(&mut registry.objects, object_id) = properties;
            } else {
                table::add(&mut registry.objects, object_id, properties);
                registry.count = registry.count + 1;
            };
            i = i + 1;
        };
    }

    /// Get properties for a specific object
    public fun get_object_properties(kiosk: &Kiosk, object_id: ID): Option<ObjectProperties> {
        if (!is_pavilion_kiosk(kiosk) || !df::exists_(kiosk.uid(), SceneObjects {})) {
            return option::none()
        };

        let registry: &SceneObjectRegistry = df::borrow(kiosk.uid(), SceneObjects {});
        if (table::contains(&registry.objects, object_id)) {
            option::some(*table::borrow(&registry.objects, object_id))
        } else {
            option::none()
        }
    }

    /// Remove object properties (when object is removed from kiosk)
    public fun remove_object_properties(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        object_id: ID
    ) {
        assert_is_pavilion_kiosk(kiosk);
        assert!(df::exists_(kiosk.uid(), SceneObjects {}), E_REGISTRY_NOT_INITIALIZED);

        let registry: &mut SceneObjectRegistry = df::borrow_mut(kiosk.uid_mut_as_owner(cap), SceneObjects {});
        if (table::contains(&registry.objects, object_id)) {
            table::remove(&mut registry.objects, object_id);
            registry.count = registry.count - 1;
        };
    }

    /// Get the count of objects in the scene
    public fun get_object_count(kiosk: &Kiosk): u64 {
        if (!is_pavilion_kiosk(kiosk) || !df::exists_(kiosk.uid(), SceneObjects {})) {
            return 0
        };

        let registry: &SceneObjectRegistry = df::borrow(kiosk.uid(), SceneObjects {});
        registry.count
    }

    /// Toggle object display status
    public fun toggle_object_display(
        kiosk: &mut Kiosk,
        cap: &KioskOwnerCap,
        object_id: ID,
        ctx: &mut TxContext
    ) {
        assert_is_pavilion_kiosk(kiosk);
        assert!(df::exists_(kiosk.uid(), SceneObjects {}), E_REGISTRY_NOT_INITIALIZED);

        let registry: &mut SceneObjectRegistry = df::borrow_mut(kiosk.uid_mut_as_owner(cap), SceneObjects {});
        if (table::contains(&registry.objects, object_id)) {
            let properties = table::borrow_mut(&mut registry.objects, object_id);
            properties.displayed = !properties.displayed;
            properties.updated_at = tx_context::epoch_timestamp_ms(ctx);
        };
    }

    // == Private Functions ==

    /// Initialize scene object registry for a new pavilion
    fun init_scene_object_registry(kiosk: &mut Kiosk, cap: &KioskOwnerCap, ctx: &mut TxContext) {
        let registry = SceneObjectRegistry {
            objects: table::new(ctx),
            count: 0,
        };
        df::add(kiosk.uid_mut_as_owner(cap), SceneObjects {}, registry);
    }

    /// Validate that a vector has exactly 3 elements (for 3D coordinates)
    fun validate_vector3(vec: &vector<u64>) {
        assert!(vector::length(vec) == 3, E_INVALID_VECTOR_SIZE);
    }

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
