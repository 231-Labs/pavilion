/// Module: demo_nft
module demo_nft::demo_nft{
    
    use std::string::{Self, String};
    use sui::{
        transfer::{public_transfer, public_share_object},
        package,
        display,
        transfer_policy,
        kiosk::{Kiosk},
        coin::{Coin},
        sui::SUI
    };

    public struct DemoNFT has key, store{
        id: UID,
        name: String,
        description: String,
        image: String,
        glb_file: String, // walrus blob id for glb file
    }

    /// One-time witness
    public struct DEMO_NFT has drop {}

    // == Royalty Rule Structures ==

    /// Royalty rule identifier
    public struct RoyaltyRule has drop {}

    /// Royalty configuration
    public struct RoyaltyConfig has store, drop {
        creator: address,    // creator address
        rate_bp: u64,       // royalty rate (basis points, 100 = 1%)
    }

    /// Royalty receipt - proof royalty has been paid
    public struct RoyaltyReceipt has drop {}

    /// This sets up the standard fields and adds an extra `glb_file` field.
    #[allow(lint(share_owned))]
    fun init(otw: DEMO_NFT, ctx: &mut TxContext) {
        // Claim the package Publisher so we can create the Display
        let publisher = package::claim(otw, ctx);

        // Create Display object
        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"), 
            string::utf8(b"glb_file"),
        ];

        let values = vector[
            string::utf8(b"{name}"),
            string::utf8(b"{description}"),
            string::utf8(b"{image}"),
            string::utf8(b"{glb_file}"),
        ];

        let mut disp = display::new_with_fields<DemoNFT>(&publisher, keys, values, ctx);
        display::update_version(&mut disp);

        // Create TransferPolicy for DemoNFT
        let (transfer_policy, policy_cap) = transfer_policy::new<DemoNFT>(&publisher, ctx);
        

        // Return control objects to the transaction sender
        public_transfer(disp, ctx.sender());
        public_transfer(publisher, ctx.sender());
        
        // Share the TransferPolicy for public use
        public_share_object(transfer_policy);
        // Transfer PolicyCap to sender for future rule management
        public_transfer(policy_cap, ctx.sender());
    }

    /// Mint a new DemoNFT with Sui Display-compatible fields.
    entry fun mint(
        name: String,
        description: String,
        image: String,
        glb_file: String,
        ctx: &mut TxContext
    ) {
        let nft = DemoNFT {
            id: object::new(ctx),
            name,
            description,
            image,
            glb_file,
        };
        public_transfer(nft, ctx.sender());
    }

    /// Delete a DemoNFT
    entry fun delete(
        nft: DemoNFT
    ) {
        let DemoNFT { id, name: _, description: _, image: _, glb_file: _ } = nft;
        object::delete(id);
    }

    // == Royalty Rule Functions ==
    
    /// Add royalty rule to TransferPolicy
    public fun add_royalty_rule(
        policy: &mut transfer_policy::TransferPolicy<DemoNFT>,
        policy_cap: &transfer_policy::TransferPolicyCap<DemoNFT>,
        creator: address,
        rate_bp: u64  // basis points, 500 = 5%
    ) {
        let config = RoyaltyConfig {
            creator,
            rate_bp,
        };
        transfer_policy::add_rule<DemoNFT, RoyaltyRule, RoyaltyConfig>(
            RoyaltyRule {},
            policy,
            policy_cap,
            config
        );
    }
    
    /// Pay royalty and add receipt
    public fun pay_royalty_and_add_receipt(
        policy: &transfer_policy::TransferPolicy<DemoNFT>,
        transfer_request: &mut transfer_policy::TransferRequest<DemoNFT>,
        royalty_payment: Coin<SUI>
    ) {
        // Get royalty configuration
        let config = transfer_policy::get_rule<DemoNFT, RoyaltyRule, RoyaltyConfig>(
            RoyaltyRule {},
            policy
        );
        
        // Pay royalty to creator
        sui::transfer::public_transfer(royalty_payment, config.creator);

        // Add receipt to prove royalty has been paid
        transfer_policy::add_receipt<DemoNFT, RoyaltyRule>(
            RoyaltyRule {},
            transfer_request
        );
    }
    
    /// Calculate royalty amount
    public fun calculate_royalty(
        policy: &transfer_policy::TransferPolicy<DemoNFT>,
        price: u64
    ): u64 {
        let config = transfer_policy::get_rule<DemoNFT, RoyaltyRule, RoyaltyConfig>(
            RoyaltyRule {},
            policy
        );
        (price * config.rate_bp) / 10000
    }

    // == TransferPolicy Utility Functions ==
    
    /// Get the object ID of a DemoNFT (useful for kiosk operations)
    public fun get_nft_id(nft: &DemoNFT): ID {
        object::id(nft)
    }

    /// Get the name of a DemoNFT
    public fun get_name(nft: &DemoNFT): String {
        nft.name
    }

    /// Get the description of a DemoNFT
    public fun get_description(nft: &DemoNFT): String {
        nft.description
    }

    /// Get the image URL of a DemoNFT
    public fun get_image(nft: &DemoNFT): String {
        nft.image
    }

    /// Get the GLB file blob ID of a DemoNFT
    public fun get_glb_file(nft: &DemoNFT): String {
        nft.glb_file
    }
    
    /// Purchase NFT from kiosk and pay royalty
    public fun purchase_with_royalty(
        kiosk: &mut Kiosk,
        item_id: ID,
        payment: Coin<SUI>,
        royalty_payment: Coin<SUI>,
        policy: &transfer_policy::TransferPolicy<DemoNFT>,
        _ctx: &mut TxContext
    ): DemoNFT {
        // 1. Purchase NFT from kiosk
        let (nft, mut transfer_request) = sui::kiosk::purchase<DemoNFT>(
            kiosk, 
            item_id, 
            payment
        );
        
        // 2. Pay royalty and add receipt
        pay_royalty_and_add_receipt(
            policy,
            &mut transfer_request,
            royalty_payment
        );
        
        // 3. Confirm transfer request
        transfer_policy::confirm_request(policy, transfer_request);
        
        nft
    }

}


