# ChoiceKernel

A standalone GenLayer comparison primitive: independently validated semantic comparisons form a bounded matrix, then strongest paths resolve cycles without a fabricated global AI ranking.

The deployer freezes 1–3 equally weighted preference criteria and 2–4 candidate documents. Anyone can compare an unfinished pair in any order. Every leader and validator fetches the complete commit-pinned documents and verifies SHA-256 bytes. Validators derive their own criterion decisions, require exact agreement on LEFT/RIGHT/TIE/UNRESOLVED, then check the leader's source anchors. Accepted comparisons cannot be overwritten.

After every pair is recorded, anyone finalizes. A pair's directional strength is the number of criteria preferring that side; an edge exists only when that count exceeds the opposing count, with ties abstaining. The maximum bottleneck path matrix yields a winner set. Ties and cycles can produce co-winners. Any unresolved criterion blocks selection for the whole tournament. There is no owner override or arbitrary alphabetical tie-break.

## Files

- [Standalone pinned contract](contracts/choice_kernel.py)
- [Architecture and consensus boundary](docs/architecture.md)
- [Direct tests](tests/direct/)
- [CLI deployment and verified receipts](proofs/README.md)
- [Example comparison rules](config/criteria.json)

## Run

```sh
pip install -r requirements.txt
genvm-lint download --version v0.2.16
genvm-lint check contracts/choice_kernel.py --json
pytest tests/direct/ -q
npm install
node scripts/verify-proofs.cjs
```

The manual StudioNet workflow runs the official GenLayer CLI with an ephemeral gasless account. It verifies execution success, finalized consensus, exact deployed source, all stored decisions and resulting winner sets; sanitized receipts are uploaded as an artifact.

## Contract interface

| Entry point | Input and behavior |
| --- | --- |
| Constructor | JSON arrays: criteria `{id,rule}` and candidates `{name,url,sha256}`. See `config/criteria.json`; URLs must reference a full 40-character Git commit. |
| `compare(left,right)` | Candidate indexes with `0 <= left < right < n`. Independently evaluate that unfinished pair. |
| `finalize()` | Require every pair and freeze the terminal result. No AI call occurs here. |
| `get_state()` | Configuration, completion count, all accepted source-linked judgments and final matrices. |

For a three-candidate tournament, call `compare(0,1)`, `compare(0,2)` and `compare(1,2)` in any order, then `finalize()`. New documentation or changed criteria require a new deployment. The public proof workflow targets **StudioNet, chain 61999**, a gasless testing environment, not a production deployment.

## Scope

Useful for selecting documented alternatives under transparent criteria without hiding preference cycles inside a single model ranking. This compares published claims; it does not establish that software implements those claims. The example documents are synthetic. Caller-chosen criteria and source selection can bias results. Immutable hashing verifies bytes, not source authenticity. Ambiguity may prevent consensus; unresolved accepted pairs require a fresh tournament to correct. No assets, custody, service delivery certification or legal clearance are involved.

Strongest-path resolution adapts the established [Schulze method](https://arxiv.org/abs/1804.02973). Criteria are pairwise semantic judgments, not complete voter rankings, so classical election properties are not asserted. The novel contract mechanism is per-pair consensus acquisition and immutable, source-bound matrix resolution, not invention of the voting algorithm.
