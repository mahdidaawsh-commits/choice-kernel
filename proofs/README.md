# StudioNet proofs

Four deployments and **14 transactions** executed successfully and finalized with `MAJORITY_AGREE` on gasless **StudioNet (chain 61999)**. Six comparison transactions acquired documents and ran AI consensus; deployment and finalization transactions are deterministic. These are testing-environment proofs, not production claims.

| Scenario | Contract | Deployment | Finalization | Verified result |
| --- | --- | --- | --- | --- |
| Preference cycle | `0xdA2A81E90516562025B4e0E5392e48370Df9BF95` | [Deploy](https://explorer-studio.genlayer.com/tx/0xbaa5f8e4676b241da5c50ad7ee187425cb420b8ff129da615c65a46838032b5f) | [Finalize](https://explorer-studio.genlayer.com/tx/0x487cfa7fcf0227e3b62480b8b25e38decf764e17df25408c37cfc2c219738895) | A>B, B>C, C>A at strength2; co-winners `[0,1,2]` |
| Dominant alternative | `0xF01aE4f00a88e70219A7AcBBE66ca1df7fAdf0f3` | [Deploy](https://explorer-studio.genlayer.com/tx/0xca4baf4b659d4107e21593ba1bd538bf8d6cfa1fb755e1639c43a10d000e99a0) | [Finalize](https://explorer-studio.genlayer.com/tx/0x3998496c1d374a528c5c65396c5de80cd5d258368ca475a2e80938373c8f498f) | UNIQUE `[0]`; strength3 |
| Equivalent documented capabilities | `0x8B7F000007D6d5819D6cd5521241C8864A8b5DeC` | [Deploy](https://explorer-studio.genlayer.com/tx/0x7ebd3857f25a375f7fd99d0cd12db3fd69d45f726a8062de60453ccc94bc0c77) | [Finalize](https://explorer-studio.genlayer.com/tx/0xfacd16675d6afe2ddfcd495598a9b7c582225158da612c3b8ea71911ca23f3ea) | CO_WINNERS `[0,1]`; no invented preference |
| Undocumented alternative | `0x644B994c873351AFcc383eF8c579AA3813DF7b30` | [Deploy](https://explorer-studio.genlayer.com/tx/0x228f886088ef6665129ec4fe3e8722c8d1da42e4a3cecdf6f273e5859c6fc4c9) | [Finalize](https://explorer-studio.genlayer.com/tx/0xb184cc679e9d875c76b61c8068e255877f1b51feb372b768b6e22d9681844433) | UNRESOLVED `[]`; missing facts are not a tie or loss |

## Consequential AI comparisons

- Cycle A/B: [transaction](https://explorer-studio.genlayer.com/tx/0x562c8efe7ca1d98c9d5b8aaab4e0f61e0917b632911ad57353eed6d78b8108c1) · [receipt](cycle-0-1-compare-receipt.json): LEFT, RIGHT, LEFT.
- Cycle A/C: [transaction](https://explorer-studio.genlayer.com/tx/0xdb0d46d0d5e5d5b2a88ede5daeca5f1e5e0fa918c2c21e0f1969658187955945) · [receipt](cycle-0-2-compare-receipt.json): LEFT, RIGHT, RIGHT.
- Cycle B/C: [transaction](https://explorer-studio.genlayer.com/tx/0x04b9a02d14a9155d249cc507cd534c1e069c28a0b1ee3c0a664dfa40a978a090) · [receipt](cycle-1-2-compare-receipt.json): LEFT, LEFT, RIGHT. Three agree, one disagree, one idle; dissent is preserved.
- Dominant: [transaction](https://explorer-studio.genlayer.com/tx/0x4dfb90ac6feafb31a4f8ae7192e8e543426d874f7d31545076441a7cd5d54897) · [receipt](dominant-0-1-compare-receipt.json): all LEFT.
- Tie: [transaction](https://explorer-studio.genlayer.com/tx/0x1cd90aa6b8af082f912d044232ca2cba3dfe8d09f0bb34ec16b3595209b57bb0) · [receipt](tie-0-1-compare-receipt.json): all TIE.
- Unknown: [transaction](https://explorer-studio.genlayer.com/tx/0xc41270aeca4c657eb58e33ed5e6e96065ceac4aec8981c8e85a334e0a5425ce3) · [receipt](unknown-0-1-compare-receipt.json): all UNRESOLVED.

## Reproduce verification

[Successful official CLI workflow](https://github.com/mahdidaawsh-commits/choice-kernel/actions/runs/37133436740). Final state manifests: [cycle](cycle.json), [dominant](dominant.json), [tie](tie.json), [unknown](unknown.json). Each includes the source hash, document commitments, every transaction and the complete onchain read. All four deployed code reads matched the source byte-for-byte. Local source SHA-256: `e7465a352f7cfb2f9309e409faf66119559bb77b991703397cf9cfa8f7e340b3`.

```sh
node scripts/verify-proofs.cjs
genlayer network set studionet
genlayer call 0xdA2A81E90516562025B4e0E5392e48370Df9BF95 get_state
genlayer receipt 0x04b9a02d14a9155d249cc507cd534c1e069c28a0b1ee3c0a664dfa40a978a090
```

The offline checker validates stored receipt hashes, execution success, finality, at least three agreement votes per transaction, source hashes, complete comparison commitments and expected winner sets. The live runner additionally fetched published fixtures, read deployed source, checked every criterion decision, and verified both direct and strongest-path matrices. Offline checking alone does not query the chain.

Receipt sanitization removes `node_config` and secret-bearing fields; actual votes and dissent remain. Idle validators may be cancelled after quorum and are not counted as agreement. All example documents are synthetic; these results verify comparative processing of those documents, not whether any real software provides their claimed capabilities.
