const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const canonical = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item);
const read = name => JSON.parse(fs.readFileSync(path.join(root,'proofs',name+'.json')));
const expected = {cycle:['CO_WINNERS',[0,1,2]],dominant:['UNIQUE',[0]],tie:['CO_WINNERS',[0,1]],unknown:['UNRESOLVED',[]]};
const sourceHash = digest(fs.readFileSync(path.join(root,'contracts/choice_kernel.py')));
let transactions = 0;
for (const [name,[status,winners]] of Object.entries(expected)) {
  const proof = read(name);
  assert.equal(proof.chain_id,61999);
  assert.equal(proof.network,'studionet');
  assert.equal(proof.source_sha256,sourceHash);
  assert.equal(proof.exact_source_match,true);
  const state=proof.state, config=state.configuration;
  assert.equal(state.completed,state.required);
  assert.equal(state.outcome.status,status);
  assert.deepEqual(state.outcome.winners,winners);
  assert.equal(state.outcome.comparison_root,digest(canonical({config,comparisons:state.comparisons})));
  for (const candidate of config.candidates) {
    assert(candidate.url.includes('/'+proof.fixture_revision+'/fixtures/'));
    const bytes=fs.readFileSync(path.join(root,'fixtures',new URL(candidate.url).pathname.split('/').pop()));
    assert.equal(digest(bytes),candidate.sha256);
  }
  for (const transaction of proof.transactions) {
    const label=transaction.action==='compare' ? `${name}-${transaction.left}-${transaction.right}-compare` : `${name}-${transaction.action}`;
    const receipt=read(label+'-receipt');
    assert.equal(receipt.hash,transaction.hash);
    assert.equal(receipt.status_name || receipt.statusName,'FINALIZED');
    assert.equal(receipt.result_name,'MAJORITY_AGREE');
    assert(['SUCCESS','FINISHED_WITH_RETURN'].includes(receipt.txExecutionResultName || receipt.consensus_data?.leader_receipt?.[0]?.execution_result));
    assert(Object.values(receipt.consensus_data.votes).filter(vote=>vote==='agree').length>=3);
    if (transaction.action!=='deploy') assert.equal(receipt.to_address.toLowerCase(),proof.contract_address.toLowerCase());
    transactions++;
  }
  console.log('VERIFIED',name,status,proof.contract_address);
}
assert.equal(transactions,14);
console.log('Verified 4 scenarios, 14 finalized receipts and source-bound commitments.');
