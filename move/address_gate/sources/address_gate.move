/// Seal access policy: only the address embedded in the identity bytes can decrypt.
/// Deploy once — never upgrade (Seal requires package version == 1).
module address_gate::address_gate {
    use sui::tx_context::TxContext;

    /// Called by Seal key servers to verify the caller owns the encrypted identity.
    /// `id` must be exactly 32 bytes representing a Sui address.
    entry fun seal_approve(id: vector<u8>, ctx: &TxContext) {
        assert!(id.length() == 32, 0);
        let addr = address::from_bytes(id);
        assert!(ctx.sender() == addr, 0);
    }
}
