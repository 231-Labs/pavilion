#[test_only]
module pavilion::pavilion_tests {
    use std::{string};
    use sui::{
        test_scenario::{Self, Scenario},
        test_utils,
        kiosk::{Self, Kiosk, KioskOwnerCap},
    };
    use pavilion::pavilion;

    // Test constants
    const SELLER: address = @0x5E11E4;


    /// Helper function to create a test kiosk
    fun create_test_kiosk(scenario: &mut Scenario): (Kiosk, KioskOwnerCap) {
        let (kiosk, kiosk_cap) = kiosk::new(test_scenario::ctx(scenario));
        (kiosk, kiosk_cap)
    }

    #[test]
    fun test_pavilion_initialization() {
        let mut scenario = test_scenario::begin(SELLER);
        
        // Create a kiosk
        let (mut kiosk, kiosk_cap) = create_test_kiosk(&mut scenario);
        
        // Verify kiosk is not pavilion initially
        assert!(!pavilion::is_pavilion_kiosk(&kiosk), 0);
        
        // Initialize pavilion
        let pavilion_name = string::utf8(b"Test Pavilion");
        pavilion::initialize_pavilion(&mut kiosk, &kiosk_cap, pavilion_name, test_scenario::ctx(&mut scenario));
        
        // Verify kiosk is now a pavilion
        assert!(pavilion::is_pavilion_kiosk(&kiosk), 1);
        
        // Verify pavilion name was set
        let stored_name = pavilion::pavilion_name(&kiosk);
        assert!(option::is_some(&stored_name), 2);
        assert!(option::destroy_some(stored_name) == string::utf8(b"Test Pavilion"), 3);
        
        // Verify object count is initially 0
        assert!(pavilion::get_object_count(&kiosk) == 0, 4);
        
        test_utils::destroy(kiosk);
        test_utils::destroy(kiosk_cap);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_pavilion_name_management() {
        let mut scenario = test_scenario::begin(SELLER);
        
        let (mut kiosk, kiosk_cap) = create_test_kiosk(&mut scenario);
        
        // Initialize pavilion
        let initial_name = string::utf8(b"Initial Name");
        pavilion::initialize_pavilion(&mut kiosk, &kiosk_cap, initial_name, test_scenario::ctx(&mut scenario));
        
        // Update pavilion name
        let new_name = string::utf8(b"Updated Name");
        pavilion::update_pavilion_name(&mut kiosk, &kiosk_cap, new_name);
        
        // Verify updated name
        let stored_name = pavilion::pavilion_name(&kiosk);
        assert!(option::is_some(&stored_name), 0);
        assert!(option::destroy_some(stored_name) == string::utf8(b"Updated Name"), 1);
        
        test_utils::destroy(kiosk);
        test_utils::destroy(kiosk_cap);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_scene_configuration() {
        let mut scenario = test_scenario::begin(SELLER);
        
        let (mut kiosk, kiosk_cap) = create_test_kiosk(&mut scenario);
        
        // Initialize pavilion
        let pavilion_name = string::utf8(b"Test Pavilion");
        pavilion::initialize_pavilion(&mut kiosk, &kiosk_cap, pavilion_name, test_scenario::ctx(&mut scenario));
        
        // Set scene config
        let config_blob = string::utf8(b"walrus_blob_id_12345");
        pavilion::set_scene_config(&mut kiosk, &kiosk_cap, config_blob);
        
        // Get scene config
        let stored_config = pavilion::scene_config_blob(&kiosk);
        assert!(option::is_some(&stored_config), 0);
        assert!(option::destroy_some(stored_config) == string::utf8(b"walrus_blob_id_12345"), 1);
        
        test_utils::destroy(kiosk);
        test_utils::destroy(kiosk_cap);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_object_properties_management() {
        let mut scenario = test_scenario::begin(SELLER);
        
        let (mut kiosk, kiosk_cap) = create_test_kiosk(&mut scenario);
        
        // Initialize pavilion
        let pavilion_name = string::utf8(b"Test Pavilion");
        pavilion::initialize_pavilion(&mut kiosk, &kiosk_cap, pavilion_name, test_scenario::ctx(&mut scenario));
        
        // Create test object properties
        let object_id = object::id_from_address(@0x1234);
        let position = vector[100, 200, 300];
        let rotation = vector[0, 90, 0];
        let scale = 1500; // 1.5x scale
        
        // Set object properties
        pavilion::set_object_properties(
            &mut kiosk, 
            &kiosk_cap, 
            object_id, 
            true,     // displayed
            position, 
            rotation, 
            scale, 
            test_scenario::ctx(&mut scenario)
        );
        
        // Verify object count increased
        assert!(pavilion::get_object_count(&kiosk) == 1, 0);
        
        // Get object properties
        let properties_opt = pavilion::get_object_properties(&kiosk, object_id);
        assert!(option::is_some(&properties_opt), 1);
        
        let _properties = option::destroy_some(properties_opt);
        // Note: ObjectProperties fields are not publicly accessible, 
        // so we can only test that the properties exist and operations work
        
        // Toggle display status
        pavilion::toggle_object_display(&mut kiosk, &kiosk_cap, object_id, test_scenario::ctx(&mut scenario));
        let _updated_properties = option::destroy_some(pavilion::get_object_properties(&kiosk, object_id));
        
        // Remove object properties
        pavilion::remove_object_properties(&mut kiosk, &kiosk_cap, object_id);
        assert!(pavilion::get_object_count(&kiosk) == 0, 2);
        assert!(option::is_none(&pavilion::get_object_properties(&kiosk, object_id)), 3);
        
        test_utils::destroy(kiosk);
        test_utils::destroy(kiosk_cap);
        test_scenario::end(scenario);
    }

    #[test, expected_failure]
    fun test_pavilion_name_too_short() {
        let mut scenario = test_scenario::begin(SELLER);
        
        let (mut kiosk, kiosk_cap) = create_test_kiosk(&mut scenario);
        
        // Try to initialize with empty name (should fail)
        let empty_name = string::utf8(b"");
        pavilion::initialize_pavilion(&mut kiosk, &kiosk_cap, empty_name, test_scenario::ctx(&mut scenario));
        
        test_utils::destroy(kiosk);
        test_utils::destroy(kiosk_cap);
        test_scenario::end(scenario);
    }

    #[test, expected_failure]
    fun test_update_name_on_non_pavilion_fails() {
        let mut scenario = test_scenario::begin(SELLER);
        
        let (mut kiosk, kiosk_cap) = create_test_kiosk(&mut scenario);
        
        // Try to update name without initializing pavilion (should fail)
        let name = string::utf8(b"Test Name");
        pavilion::update_pavilion_name(&mut kiosk, &kiosk_cap, name);
        
        test_utils::destroy(kiosk);
        test_utils::destroy(kiosk_cap);
        test_scenario::end(scenario);
    }

    #[test, expected_failure]
    fun test_set_object_properties_on_non_pavilion_fails() {
        let mut scenario = test_scenario::begin(SELLER);
        
        let (mut kiosk, kiosk_cap) = create_test_kiosk(&mut scenario);
        
        // Try to set object properties without initializing pavilion (should fail)
        let object_id = object::id_from_address(@0x1234);
        pavilion::set_object_properties(
            &mut kiosk, 
            &kiosk_cap, 
            object_id, 
            true, 
            vector[0, 0, 0], 
            vector[0, 0, 0], 
            1000, 
            test_scenario::ctx(&mut scenario)
        );
        
        test_utils::destroy(kiosk);
        test_utils::destroy(kiosk_cap);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_kiosk_to_pavilion_conversion_detailed() {
        let mut scenario = test_scenario::begin(SELLER);
        
        // Step 1: Create a regular kiosk
        let (mut kiosk, kiosk_cap) = create_test_kiosk(&mut scenario);
        
        // Step 2: Verify it's NOT a pavilion initially
        assert!(!pavilion::is_pavilion_kiosk(&kiosk), 0);
        
        // Step 3: Verify pavilion-specific operations return empty/none
        let name_result = pavilion::pavilion_name(&kiosk);
        assert!(option::is_none(&name_result), 1);
        
        let config_result = pavilion::scene_config_blob(&kiosk);
        assert!(option::is_none(&config_result), 2);
        
        // Object count should be 0 for non-pavilion kiosk
        assert!(pavilion::get_object_count(&kiosk) == 0, 3);
        
        // Step 4: Convert to pavilion kiosk using initialize_pavilion
        let pavilion_name = string::utf8(b"My New Pavilion");
        pavilion::initialize_pavilion(&mut kiosk, &kiosk_cap, pavilion_name, test_scenario::ctx(&mut scenario));
        
        // Step 5: Verify conversion was successful
        assert!(pavilion::is_pavilion_kiosk(&kiosk), 4);
        
        // Step 6: Verify pavilion functionality now works
        let stored_name = pavilion::pavilion_name(&kiosk);
        assert!(option::is_some(&stored_name), 5);
        assert!(option::destroy_some(stored_name) == string::utf8(b"My New Pavilion"), 6);
        
        // Object count should still be 0 but registry should be initialized
        assert!(pavilion::get_object_count(&kiosk) == 0, 7);
        
        // Step 7: Verify pavilion-specific operations now work
        let scene_config = string::utf8(b"scene_config_123");
        pavilion::set_scene_config(&mut kiosk, &kiosk_cap, scene_config);
        
        let stored_config = pavilion::scene_config_blob(&kiosk);
        assert!(option::is_some(&stored_config), 8);
        assert!(option::destroy_some(stored_config) == string::utf8(b"scene_config_123"), 9);
        
        // Step 8: Test object properties functionality
        let object_id = object::id_from_address(@0xABCD);
        pavilion::set_object_properties(
            &mut kiosk, 
            &kiosk_cap, 
            object_id, 
            true, 
            vector[10, 20, 30], 
            vector[45, 90, 0], 
            1200, 
            test_scenario::ctx(&mut scenario)
        );
        
        // Verify object was added
        assert!(pavilion::get_object_count(&kiosk) == 1, 10);
        
        let props = pavilion::get_object_properties(&kiosk, object_id);
        assert!(option::is_some(&props), 11);
        
        test_utils::destroy(kiosk);
        test_utils::destroy(kiosk_cap);
        test_scenario::end(scenario);
    }

    #[test]
    fun test_reinitialize_existing_pavilion() {
        let mut scenario = test_scenario::begin(SELLER);
        
        let (mut kiosk, kiosk_cap) = create_test_kiosk(&mut scenario);
        
        // First initialization
        let first_name = string::utf8(b"Original Name");
        pavilion::initialize_pavilion(&mut kiosk, &kiosk_cap, first_name, test_scenario::ctx(&mut scenario));
        
        assert!(pavilion::is_pavilion_kiosk(&kiosk), 0);
        let stored_name = option::destroy_some(pavilion::pavilion_name(&kiosk));
        assert!(stored_name == string::utf8(b"Original Name"), 1);
        
        // Second initialization (should just update the name, not reinstall extension)
        let second_name = string::utf8(b"Updated Name");
        pavilion::initialize_pavilion(&mut kiosk, &kiosk_cap, second_name, test_scenario::ctx(&mut scenario));
        
        // Should still be a pavilion
        assert!(pavilion::is_pavilion_kiosk(&kiosk), 2);
        
        // Name should be updated
        let updated_name = option::destroy_some(pavilion::pavilion_name(&kiosk));
        assert!(updated_name == string::utf8(b"Updated Name"), 3);
        
        test_utils::destroy(kiosk);
        test_utils::destroy(kiosk_cap);
        test_scenario::end(scenario);
    }
}
