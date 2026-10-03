# Ready-to-submit contribution

Category: Builder → Intelligent Contracts

Title: ChoiceKernel: Consensus comparison and cycle-aware choice

## Notes / Description

ChoiceKernel is a standalone GenLayer comparative-choice primitive. A deployer freezes 2–4 documents and 1–3 equally weighted preference rules; anyone completes each pair once. Leader and validators independently fetch full commit-pinned texts, check SHA-256 and derive LEFT, RIGHT, TIE or UNRESOLVED per criterion. Exact decision agreement and a separate source-anchor check gate every stored comparison. Agreed comparisons feed strongest-path resolution: a unique winner, explicit co-winners for cycles or ties, or no selection when documentation is unresolved. It stores the comparison matrix, strongest paths, quotations and source commitment. StudioNet CLI proofs cover a three-way preference cycle, a dominant alternative, equal capabilities and missing documentation. The repo includes the pinned GenVM contract, 19 direct tests and complete sanitized receipts. Fixtures are synthetic; documented claims do not prove implemented capabilities.

## Evidence

- Repository: https://github.com/mahdidaawsh-commits/choice-kernel
- GenLayer contract: https://github.com/mahdidaawsh-commits/choice-kernel/blob/main/contracts/choice_kernel.py
- Onchain proofs: https://github.com/mahdidaawsh-commits/choice-kernel/blob/main/proofs/README.md

Representative StudioNet contract: `0xdA2A81E90516562025B4e0E5392e48370Df9BF95`.

- Deployment: https://explorer-studio.genlayer.com/tx/0xbaa5f8e4676b241da5c50ad7ee187425cb420b8ff129da615c65a46838032b5f
- Cycle resolution: https://explorer-studio.genlayer.com/tx/0x487cfa7fcf0227e3b62480b8b25e38decf764e17df25408c37cfc2c219738895
- All four scenarios and 14 receipts: https://github.com/mahdidaawsh-commits/choice-kernel/blob/main/proofs/README.md

All 14 transactions finalized with MAJORITY_AGREE and execution success. One cycle comparison includes a preserved dissenting validator vote.
