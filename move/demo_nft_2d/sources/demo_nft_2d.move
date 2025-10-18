/// Module: demo_nft_2d
module demo_nft_2d::demo_nft_2d {
    
    use std::string::{Self, String};
    use sui::{
        transfer::{public_transfer, public_share_object},
        package,
        display,
        transfer_policy,
        coin::{Coin},
        sui::SUI
    };

    /// Constants
    const BASE_POINT: u64 = 10000;

    /// struct for demo nft 2d
    public struct DemoNFT2D has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        creator: address,
        attributes: vector<String>, // optional attributes list
    }

    /// One-time witness
    public struct DEMO_NFT_2D has drop {}

    /// Error codes
    const ENotCreator: u64 = 1;

    /// royalty rule identifier
    public struct RoyaltyRule has drop {}

    /// royalty configuration
    public struct RoyaltyConfig has store, drop {
        creator: address,    // creator address
        rate_bp: u64,       // royalty rate (basis points, 100 = 1%)
    }

    /// royalty receipt - proof royalty has been paid
    public struct RoyaltyReceipt has drop {}

    /// initialize function, set Display and TransferPolicy
    #[allow(lint(share_owned))]
    fun init(otw: DEMO_NFT_2D, ctx: &mut TxContext) {
        // declare package Publisher
        let publisher = package::claim(otw, ctx);

        // create Display object, use latest Sui Display standard
        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"),
            string::utf8(b"creator"),
            string::utf8(b"attributes"),
            string::utf8(b"project_url"),
        ];

        let values = vector[
            string::utf8(b"{name}"),
            string::utf8(b"{description}"),
            string::utf8(b"{image_url}"),
            string::utf8(b"{creator}"),
            string::utf8(b"{attributes}"),
            string::utf8(b"https://pavilion.wal.app"),
        ];

        let mut disp = display::new_with_fields<DemoNFT2D>(&publisher, keys, values, ctx);
        display::update_version(&mut disp);

        // create TransferPolicy
        let (transfer_policy, policy_cap) = transfer_policy::new<DemoNFT2D>(&publisher, ctx);

        // transfer control object to transaction sender
        public_transfer(disp, ctx.sender());
        public_transfer(publisher, ctx.sender());
        
        // share TransferPolicy for public use
        public_share_object(transfer_policy);
        // transfer PolicyCap to sender for future rule management
        public_transfer(policy_cap, ctx.sender());
    }

    /// mint new 2D NFT
    entry fun mint(
        name: String,
        description: String,
        image_url: String,
        attributes: vector<String>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let nft = DemoNFT2D {
            id: object::new(ctx),
            name,
            description,
            image_url,
            creator: ctx.sender(),
            attributes,
        };
        public_transfer(nft, recipient);
    }

    /// batch mint NFT
    entry fun batch_mint(
        names: vector<String>,
        descriptions: vector<String>,
        image_urls: vector<String>,
        attributes_list: vector<vector<String>>,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let len = names.length();
        assert!(len == descriptions.length(), 0);
        assert!(len == image_urls.length(), 0);
        assert!(len == attributes_list.length(), 0);

        let mut i = 0;
        while (i < len) {
            let nft = DemoNFT2D {
                id: object::new(ctx),
                name: names[i],
                description: descriptions[i],
                image_url: image_urls[i],
                creator: ctx.sender(),
                attributes: attributes_list[i],
            };
            public_transfer(nft, recipient);
            i = i + 1;
        };
    }

    /// destroy NFT
    entry fun burn(nft: DemoNFT2D) {
        let DemoNFT2D { 
            id, 
            name: _, 
            description: _, 
            image_url: _, 
            creator: _, 
            attributes: _ 
        } = nft;
        object::delete(id);
    }

    /// update NFT description (only creator can update)
    entry fun update_description(
        nft: &mut DemoNFT2D,
        new_description: String,
        ctx: &TxContext
    ) {
        assert!(nft.creator == ctx.sender(), ENotCreator);
        nft.description = new_description;
    }

    /// add attribute (only creator can add)
    entry fun add_attribute(
        nft: &mut DemoNFT2D,
        attribute: String,
        ctx: &TxContext
    ) {
        assert!(nft.creator == ctx.sender(), ENotCreator);
        nft.attributes.push_back(attribute);
    }

    /// update image URL (only publisher can update)
    entry fun update_image_url(
        _publisher: &package::Publisher,
        nft: &mut DemoNFT2D,
        new_image_url: String,
    ) {
        nft.image_url = new_image_url;
    }

    // == royalty rule functions ==
    
    /// add royalty rule to TransferPolicy
    public fun add_royalty_rule(
        policy: &mut transfer_policy::TransferPolicy<DemoNFT2D>,
        policy_cap: &transfer_policy::TransferPolicyCap<DemoNFT2D>,
        creator: address,
        rate_bp: u64  // basis points, 500 = 5%
    ) {
        let config = RoyaltyConfig {
            creator,
            rate_bp,
        };
        transfer_policy::add_rule<DemoNFT2D, RoyaltyRule, RoyaltyConfig>(
            RoyaltyRule {},
            policy,
            policy_cap,
            config
        );
    }

    /// remove royalty rule from TransferPolicy
    public fun remove_royalty_rule(
        policy: &mut transfer_policy::TransferPolicy<DemoNFT2D>,
        policy_cap: &transfer_policy::TransferPolicyCap<DemoNFT2D>,
    ) {
        transfer_policy::remove_rule<DemoNFT2D, RoyaltyRule, RoyaltyConfig>(
            policy,
            policy_cap
        );
    }

    /// check if royalty rule is set
    public fun has_royalty_rule(
        policy: &transfer_policy::TransferPolicy<DemoNFT2D>
    ): bool {
        transfer_policy::has_rule<DemoNFT2D, RoyaltyRule>(policy)
    }
    
    /// pay royalty and add receipt
    public fun pay_royalty_and_add_receipt(
        policy: &transfer_policy::TransferPolicy<DemoNFT2D>,
        transfer_request: &mut transfer_policy::TransferRequest<DemoNFT2D>,
        royalty_payment: Coin<SUI>
    ) {
        // get royalty configuration
        let config = transfer_policy::get_rule<DemoNFT2D, RoyaltyRule, RoyaltyConfig>(
            RoyaltyRule {},
            policy
        );
        
        // pay royalty to creator
        public_transfer(royalty_payment, config.creator);

        // add receipt to prove royalty has been paid
        transfer_policy::add_receipt<DemoNFT2D, RoyaltyRule>(
            RoyaltyRule {},
            transfer_request
        );
    }
    
    /// calculate royalty amount
    public fun calculate_royalty(
        policy: &transfer_policy::TransferPolicy<DemoNFT2D>,
        price: u64
    ): u64 {
        let config = transfer_policy::get_rule<DemoNFT2D, RoyaltyRule, RoyaltyConfig>(
            RoyaltyRule {},
            policy
        );
        (price * config.rate_bp) / BASE_POINT
    }

    // == query functions ==
    
    /// get NFT ID
    public fun get_nft_id(nft: &DemoNFT2D): ID {
        object::id(nft)
    }

    /// get NFT name
    public fun get_name(nft: &DemoNFT2D): String {
        nft.name
    }

    /// get NFT description
    public fun get_description(nft: &DemoNFT2D): String {
        nft.description
    }

    /// get image URL
    public fun get_image_url(nft: &DemoNFT2D): String {
        nft.image_url
    }

    /// get creator address
    public fun get_creator(nft: &DemoNFT2D): address {
        nft.creator
    }

    /// get attributes list
    public fun get_attributes(nft: &DemoNFT2D): vector<String> {
        nft.attributes
    }

    /// get attributes count
    public fun get_attributes_count(nft: &DemoNFT2D): u64 {
        nft.attributes.length()
    }

    // == test functions ==
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(DEMO_NFT_2D {}, ctx);
    }
}
