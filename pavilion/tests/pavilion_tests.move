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
        
        
        // Step 4: Convert to pavilion kiosk using initialize_pavilion
        let pavilion_name = string::utf8(b"My New Pavilion");
        pavilion::initialize_pavilion(&mut kiosk, &kiosk_cap, pavilion_name, test_scenario::ctx(&mut scenario));
        
        // Step 5: Verify conversion was successful
        assert!(pavilion::is_pavilion_kiosk(&kiosk), 4);
        
        // Step 6: Verify pavilion functionality now works
        let stored_name = pavilion::pavilion_name(&kiosk);
        assert!(option::is_some(&stored_name), 5);
        assert!(option::destroy_some(stored_name) == string::utf8(b"My New Pavilion"), 6);
        
        // Step 7: Verify scene configuration functionality
        let scene_config = string::utf8(b"scene_config_123");
        pavilion::set_scene_config(&mut kiosk, &kiosk_cap, scene_config);
        
        let stored_config = pavilion::scene_config_blob(&kiosk);
        assert!(option::is_some(&stored_config), 8);
        assert!(option::destroy_some(stored_config) == string::utf8(b"scene_config_123"), 9);
        
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
