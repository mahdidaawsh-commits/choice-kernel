# Consensus boundary and state

Input: fixed comparison rules plus immutable document locators. Sources own the published claims. The contract owns byte acquisition, independent semantic judgment, frozen comparison slots and terminal winner-set resolution. No frontend or caller supplies authoritative labels.

`compare(left,right)` requires ordered distinct indexes and an empty slot. Both sides independently fetch complete UTF-8 documents (up to 8,000 bytes each), check SHA-256 and compare each criterion. The validator's independent classification prompt receives no proposed decisions. Exact decision equality is required, including ties and uncertainty. Quote wording may vary, but each chosen quote must occur exactly in its source; a separate validator inspection checks material relevance against full documents. No confidence tolerance can cross a decision boundary.

An accepted slot records indexes, source hashes, criterion decisions and both quotations. A rejected or malformed transaction does not advance the completion count. Configuration and comparisons cannot be revised. Permissionless callers can complete any remaining pair.

`finalize()` requires all n(n-1)/2 slots. For pair (i,j), let a and b count LEFT and RIGHT criterion decisions. Set d(i,j)=a if a>b, d(j,i)=b if b>a; otherwise both zero. TIE adds no directional strength. Any UNRESOLVED judgment produces terminal UNRESOLVED with no selected candidates. Otherwise initialize p=d and apply p(i,j)=max(p(i,j),min(p(i,k),p(k,j))) for each intermediary k and distinct i,j,k. Winners satisfy p(i,j)>=p(j,i) for every rival. Store the direct and strongest-path matrices, winner indexes, status and canonical comparison commitment.

The strongest-path stage is deterministic. Its consequential inputs are the nondeterministic decisions that independently fetched evidence and multiple models must agree on. A different accepted judgment can change an edge and the winner set. Equal-cost auction coverage, license obligation unions and measurement medians are not reused.

Bounded cost: at most six pairs; two source fetches, one classification prompt per leader; two fetches, one independent classification and one anchor check per validator. Failures do not silently become missing votes. Non-returning leaders are rejected for rotation; malformed LLM answers fail rather than becoming ties. Source outages can prevent progress. Appeals and validator rotation remain network responsibilities; the contract adds no custom appeal protocol.

The cycle fixture has A>B, B>C, C>A at strength2. All strongest paths are2 and all three candidates remain co-winners. A dominating alternative yields one winner. Identical capability claims yield a tie. Missing documentation explicitly yields no winners.
