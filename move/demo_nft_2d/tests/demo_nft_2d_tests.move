/// 2D NFT module test
#[test_only]
module demo_nft_2d::demo_nft_2d_tests {
    use std::string;
    use sui::test_scenario;
    use demo_nft_2d::demo_nft_2d::{Self, DemoNFT2D};

    const ADMIN: address = @0xAD;
    const USER: address = @0xB0B;

    #[test]
    fun test_init() {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            demo_nft_2d::init_for_testing(scenario.ctx());
        };
        scenario.end();
    }

    #[test]
    fun test_mint_nft() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // initialize module
        {
            demo_nft_2d::init_for_testing(scenario.ctx());
        };
        
        // mint NFT
        scenario.next_tx(ADMIN);
        {
            let name = string::utf8(b"Test NFT");
            let description = string::utf8(b"A test 2D NFT");
            let image_url = string::utf8(b"https://example.com/image.png");
            let attributes = vector[
                string::utf8(b"Color: Blue"),
                string::utf8(b"Rarity: Common")
            ];
            
            demo_nft_2d::mint(
                name,
                description,
                image_url,
                attributes,
                USER,
                scenario.ctx()
            );
        };
        
        // verify NFT has been minted and transferred to user
        scenario.next_tx(USER);
        {
            let nft = scenario.take_from_sender<DemoNFT2D>();
            
            // verify NFT attributes
            assert!(demo_nft_2d::get_name(&nft) == string::utf8(b"Test NFT"), 0);
            assert!(demo_nft_2d::get_description(&nft) == string::utf8(b"A test 2D NFT"), 1);
            assert!(demo_nft_2d::get_image_url(&nft) == string::utf8(b"https://example.com/image.png"), 2);
            assert!(demo_nft_2d::get_creator(&nft) == ADMIN, 3);
            assert!(demo_nft_2d::get_attributes_count(&nft) == 2, 4);
            
            scenario.return_to_sender(nft);
        };
        
        scenario.end();
    }

    #[test]
    fun test_batch_mint() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // initialize module
        {
            demo_nft_2d::init_for_testing(scenario.ctx());
        };
        
        // batch mint NFT
        scenario.next_tx(ADMIN);
        {
            let names = vector[
                string::utf8(b"NFT 1"),
                string::utf8(b"NFT 2")
            ];
            let descriptions = vector[
                string::utf8(b"First NFT"),
                string::utf8(b"Second NFT")
            ];
            let image_urls = vector[
                string::utf8(b"https://example.com/1.png"),
                string::utf8(b"https://example.com/2.png")
            ];
            let attributes_list = vector[
                vector[string::utf8(b"Type: A")],
                vector[string::utf8(b"Type: B")]
            ];
            
            demo_nft_2d::batch_mint(
                names,
                descriptions,
                image_urls,
                attributes_list,
                USER,
                scenario.ctx()
            );
        };
        
        // verify two NFTs have been minted
        scenario.next_tx(USER);
        {
            let nft_ids = scenario.ids_for_sender<DemoNFT2D>();
            assert!(nft_ids.length() == 2, 0);
        };
        
        scenario.end();
    }

    #[test]
    fun test_burn_nft() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // initialize and mint NFT
        {
            demo_nft_2d::init_for_testing(scenario.ctx());
        };
        
        scenario.next_tx(ADMIN);
        {
            demo_nft_2d::mint(
                string::utf8(b"Test NFT"),
                string::utf8(b"Test Description"),
                string::utf8(b"https://example.com/image.png"),
                vector[],
                USER,
                scenario.ctx()
            );
        };
        
        // destroy NFT
        scenario.next_tx(USER);
        {
            let nft = scenario.take_from_sender<DemoNFT2D>();
            demo_nft_2d::burn(nft);
        };
        
        // verify NFT has been destroyed
        scenario.next_tx(USER);
        {
            assert!(!scenario.has_most_recent_for_sender<DemoNFT2D>(), 0);
        };
        
        scenario.end();
    }

    #[test]
    fun test_update_description() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // initialize and mint NFT
        {
            demo_nft_2d::init_for_testing(scenario.ctx());
        };
        
        scenario.next_tx(ADMIN);
        {
            demo_nft_2d::mint(
                string::utf8(b"Test NFT"),
                string::utf8(b"Original Description"),
                string::utf8(b"https://example.com/image.png"),
                vector[],
                ADMIN,
                scenario.ctx()
            );
        };
        
        // update description
        scenario.next_tx(ADMIN);
        {
            let mut nft = scenario.take_from_sender<DemoNFT2D>();
            demo_nft_2d::update_description(
                &mut nft,
                string::utf8(b"Updated Description"),
                scenario.ctx()
            );
            
            // verify description has been updated
            assert!(demo_nft_2d::get_description(&nft) == string::utf8(b"Updated Description"), 0);
            
            scenario.return_to_sender(nft);
        };
        
        scenario.end();
    }

    #[test]
    fun test_add_attribute() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // initialize and mint NFT
        {
            demo_nft_2d::init_for_testing(scenario.ctx());
        };
        
        scenario.next_tx(ADMIN);
        {
            demo_nft_2d::mint(
                string::utf8(b"Test NFT"),
                string::utf8(b"Test Description"),
                string::utf8(b"https://example.com/image.png"),
                vector[string::utf8(b"Initial Attribute")],
                ADMIN,
                scenario.ctx()
            );
        };
        
        // add attribute
        scenario.next_tx(ADMIN);
        {
            let mut nft = scenario.take_from_sender<DemoNFT2D>();
            
            // verify initial attributes count
            assert!(demo_nft_2d::get_attributes_count(&nft) == 1, 0);
            
            demo_nft_2d::add_attribute(
                &mut nft,
                string::utf8(b"New Attribute"),
                scenario.ctx()
            );
            
            // verify attribute has been added
            assert!(demo_nft_2d::get_attributes_count(&nft) == 2, 1);
            
            scenario.return_to_sender(nft);
        };
        
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 1, location = Self)]
    fun test_update_description_unauthorized() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // initialize and mint NFT
        {
            demo_nft_2d::init_for_testing(scenario.ctx());
        };
        
        scenario.next_tx(ADMIN);
        {
            demo_nft_2d::mint(
                string::utf8(b"Test NFT"),
                string::utf8(b"Original Description"),
                string::utf8(b"https://example.com/image.png"),
                vector[],
                USER,
                scenario.ctx()
            );
        };
        
        // try to update description with unauthorized user (should fail)
        scenario.next_tx(USER);
        {
            let mut nft = scenario.take_from_sender<DemoNFT2D>();
            demo_nft_2d::update_description(
                &mut nft,
                string::utf8(b"Unauthorized Update"),
                scenario.ctx()
            );
            scenario.return_to_sender(nft);
        };
        
        scenario.end();
    }
}