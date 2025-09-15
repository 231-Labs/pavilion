/// Module: demo_nft
module demo_nft::demo_nft{
    
    use std::string::{Self, String};
    use sui::transfer::{public_transfer, public_share_object};
    use sui::package;
    use sui::display;
    use sui::transfer_policy;

    public struct DemoNFT has key, store{
        id: UID,
        name: String,
        description: String,
        image: String,
        glb_file: String, // walrus blob id for glb file
    }

    /// One-time witness for package initialization
    public struct DEMO_NFT has drop {}

    // == Royalty Rule Structures ==
    
    /// 版稅規則標識符
    public struct RoyaltyRule has drop {}
    
    /// 版稅配置
    public struct RoyaltyConfig has store, drop {
        creator: address,    // 創作者地址
        rate_bp: u64,       // 版稅率（基點，100 = 1%）
    }
    
    /// 版稅收據 - 證明版稅已支付
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
    
    /// 添加版稅規則到 TransferPolicy
    public fun add_royalty_rule(
        policy: &mut transfer_policy::TransferPolicy<DemoNFT>,
        policy_cap: &transfer_policy::TransferPolicyCap<DemoNFT>,
        creator: address,
        rate_bp: u64  // 基點，500 = 5%
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
    
    /// 支付版稅並添加收據
    public fun pay_royalty_and_add_receipt(
        policy: &transfer_policy::TransferPolicy<DemoNFT>,
        transfer_request: &mut transfer_policy::TransferRequest<DemoNFT>,
        royalty_payment: sui::coin::Coin<sui::sui::SUI>
    ) {
        // 獲取版稅配置
        let config = transfer_policy::get_rule<DemoNFT, RoyaltyRule, RoyaltyConfig>(
            RoyaltyRule {},
            policy
        );
        
        // 支付版稅給創作者
        sui::transfer::public_transfer(royalty_payment, config.creator);
        
        // 添加收據證明版稅已支付
        transfer_policy::add_receipt<DemoNFT, RoyaltyRule>(
            RoyaltyRule {},
            transfer_request
        );
    }
    
    /// 計算版稅金額
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
    
    /// 從 kiosk 購買 NFT 並支付版稅
    public fun purchase_with_royalty(
        kiosk: &mut sui::kiosk::Kiosk,
        item_id: sui::object::ID,
        payment: sui::coin::Coin<sui::sui::SUI>,
        royalty_payment: sui::coin::Coin<sui::sui::SUI>,
        policy: &transfer_policy::TransferPolicy<DemoNFT>,
        _ctx: &mut sui::tx_context::TxContext
    ): DemoNFT {
        // 1. 從 kiosk 購買 NFT
        let (nft, mut transfer_request) = sui::kiosk::purchase<DemoNFT>(
            kiosk, 
            item_id, 
            payment
        );
        
        // 2. 支付版稅並添加收據
        pay_royalty_and_add_receipt(
            policy,
            &mut transfer_request,
            royalty_payment
        );
        
        // 3. 確認轉移請求
        transfer_policy::confirm_request(policy, transfer_request);
        
        nft
    }

}


