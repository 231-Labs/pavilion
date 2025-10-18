/// Module: demo_nft
module demo_nft_3d::demo_nft_3d{
    
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

    public struct DemoNFT3D has key, store{
        id: UID,
        name: String,
        description: String,
        image: String,
        glb_file: String, // walrus blob id for glb file
    }

    /// One-time witness
    public struct DEMO_NFT_3D has drop {}

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
    fun init(otw: DEMO_NFT_3D, ctx: &mut TxContext) {
        // Claim the package Publisher so we can create the Display
        let publisher = package::claim(otw, ctx);

        // Create Display object
        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"), 
            string::utf8(b"glb_file"),
            string::utf8(b"project_url"),
        ];

        let values = vector[
            string::utf8(b"{name}"),
            string::utf8(b"{description}"),
            string::utf8(b"{image}"),
            string::utf8(b"{glb_file}"),
            string::utf8(b"https://pavilion.wal.app"),
        ];

        let mut disp = display::new_with_fields<DemoNFT3D>(&publisher, keys, values, ctx);
        display::update_version(&mut disp);

        // Create TransferPolicy for DemoNFT3D
        let (transfer_policy, policy_cap) = transfer_policy::new<DemoNFT3D>(&publisher, ctx);
        

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
        recipient: address,
        ctx: &mut TxContext
    ) {
        let nft = DemoNFT3D {
            id: object::new(ctx),
            name,
            description,
            image,
            glb_file,
        };
        public_transfer(nft, recipient);
    }

    /// Delete a DemoNFT
    entry fun delete(
        nft: DemoNFT3D
    ) {
        let DemoNFT3D { id, name: _, description: _, image: _, glb_file: _ } = nft;
        object::delete(id);
    }

    /// Update image URL (only publisher can update)
    entry fun update_image(
        _publisher: &package::Publisher,
        nft: &mut DemoNFT3D,
        new_image: String,
    ) {
        nft.image = new_image;
    }

    /// Update GLB file blob ID (only publisher can update)
    entry fun update_glb_file(
        _publisher: &package::Publisher,
        nft: &mut DemoNFT3D,
        new_glb_file: String,
    ) {
        nft.glb_file = new_glb_file;
    }

    // == Royalty Rule Functions ==
    
    /// Add royalty rule to TransferPolicy
    public fun add_royalty_rule(
        policy: &mut transfer_policy::TransferPolicy<DemoNFT3D>,
        policy_cap: &transfer_policy::TransferPolicyCap<DemoNFT3D>,
        creator: address,
        rate_bp: u64  // basis points, 500 = 5%
    ) {
        let config = RoyaltyConfig {
            creator,
            rate_bp,
        };
        transfer_policy::add_rule<DemoNFT3D, RoyaltyRule, RoyaltyConfig>(
            RoyaltyRule {},
            policy,
            policy_cap,
            config
        );
    }

    /// Remove royalty rule from TransferPolicy
    public fun remove_royalty_rule(
        policy: &mut transfer_policy::TransferPolicy<DemoNFT3D>,
        policy_cap: &transfer_policy::TransferPolicyCap<DemoNFT3D>,
    ) {
        transfer_policy::remove_rule<DemoNFT3D, RoyaltyRule, RoyaltyConfig>(
            policy,
            policy_cap
        );
    }

    /// Check if royalty rule is set
    public fun has_royalty_rule(
        policy: &transfer_policy::TransferPolicy<DemoNFT3D>
    ): bool {
        transfer_policy::has_rule<DemoNFT3D, RoyaltyRule>(policy)
    }
    
    /// Pay royalty and add receipt
    public fun pay_royalty_and_add_receipt(
        policy: &transfer_policy::TransferPolicy<DemoNFT3D>,
        transfer_request: &mut transfer_policy::TransferRequest<DemoNFT3D>,
        royalty_payment: Coin<SUI>
    ) {
        // Get royalty configuration
        let config = transfer_policy::get_rule<DemoNFT3D, RoyaltyRule, RoyaltyConfig>(
            RoyaltyRule {},
            policy
        );
        
        // Pay royalty to creator
        sui::transfer::public_transfer(royalty_payment, config.creator);

        // Add receipt to prove royalty has been paid
        transfer_policy::add_receipt<DemoNFT3D, RoyaltyRule>(
            RoyaltyRule {},
            transfer_request
        );
    }
    
    /// Calculate royalty amount
    public fun calculate_royalty(
        policy: &transfer_policy::TransferPolicy<DemoNFT3D>,
        price: u64
    ): u64 {
        let config = transfer_policy::get_rule<DemoNFT3D, RoyaltyRule, RoyaltyConfig>(
            RoyaltyRule {},
            policy
        );
        (price * config.rate_bp) / 10000
    }

    // == TransferPolicy Utility Functions ==
    
    /// Get the object ID of a DemoNFT3D (useful for kiosk operations)
    public fun get_nft_id(nft: &DemoNFT3D): ID {
        object::id(nft)
    }

    /// Get the name of a DemoNFT3D
    public fun get_name(nft: &DemoNFT3D): String {
        nft.name
    }

    /// Get the description of a DemoNFT3D
    public fun get_description(nft: &DemoNFT3D): String {
        nft.description
    }

    /// Get the image URL of a DemoNFT3D
    public fun get_image(nft: &DemoNFT3D): String {
        nft.image
    }

    /// Get the GLB file blob ID of a DemoNFT3D
    public fun get_glb_file(nft: &DemoNFT3D): String {
        nft.glb_file
    }
    
    /// Purchase NFT from kiosk and pay royalty
    public fun purchase_with_royalty(
        kiosk: &mut Kiosk,
        item_id: ID,
        payment: Coin<SUI>,
        royalty_payment: Coin<SUI>,
        policy: &transfer_policy::TransferPolicy<DemoNFT3D>,
        _ctx: &mut TxContext
    ): DemoNFT3D {
        // 1. Purchase NFT from kiosk
        let (nft, mut transfer_request) = sui::kiosk::purchase<DemoNFT3D>(
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


