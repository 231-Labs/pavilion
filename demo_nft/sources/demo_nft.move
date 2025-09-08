/// Module: demo_nft
module demo_nft::demo_nft{
    
    use std::string::{Self, String};
    use sui::transfer::{public_transfer};
    use sui::package;
    use sui::display;

    public struct DemoNFT has key, store{
        id: UID,
        name: String,
        description: String,
        image: String,
        glb_file: String, // walrus blob id for glb file
    }

    /// One-time witness for package initialization
    public struct DEMO_NFT has drop {}

    /// This sets up the standard fields and adds an extra `glb_file` field.
    fun init(otw: DEMO_NFT, ctx: &mut TxContext) {
        // Claim the package Publisher so we can create the Display
        let publisher = package::claim(otw, ctx);

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

        // Return control objects to the transaction sender
        public_transfer(disp, ctx.sender());
        public_transfer(publisher, ctx.sender());
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

}


