const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const cli = process.env.GENLAYER_CLI_PATH;
const passwordFile = process.env.CHOICEKERNEL_PASSWORD_FILE;
const account = process.env.CHOICEKERNEL_ACCOUNT;
const address = process.env.CHOICEKERNEL_DEPLOYER_ADDRESS;
if (!cli || !fs.existsSync(cli) || !passwordFile || !fs.existsSync(passwordFile) || !account || !/^0x[0-9a-f]{40}$/i.test(address || '')) throw Error('Set GENLAYER_CLI_PATH, CHOICEKERNEL_PASSWORD_FILE, CHOICEKERNEL_ACCOUNT and CHOICEKERNEL_DEPLOYER_ADDRESS.');
const password = fs.readFileSync(passwordFile, 'utf8').trim();
const hook = path.join(__dirname, 'cli-config.cjs');
const source = fs.readFileSync(path.join(root, 'contracts/choice_kernel.py'));
const sourceHash = crypto.createHash('sha256').update(source).digest('hex');
const revision = fs.readFileSync(path.join(root, 'config/fixture-revision.txt'), 'utf8').trim();
const repo = 'mahdidaawsh-commits/choice-kernel';
const journal = path.join(root, '.proof-journal/studionet');
const proofs = path.join(root, 'proofs');
fs.mkdirSync(journal, { recursive: true });
const criteria = JSON.parse(fs.readFileSync(path.join(root, 'config/criteria.json')));
const cases = [
  { name: 'cycle', files: ['alder', 'birch', 'cedar'], status: 'CO_WINNERS', winners: [0,1,2], decisions: [['LEFT','RIGHT','LEFT'],['LEFT','RIGHT','RIGHT'],['LEFT','LEFT','RIGHT']], direct: [[0,2,0],[0,0,2],[2,0,0]], paths: [[0,2,2],[2,0,2],[2,2,0]] },
  { name: 'dominant', files: ['dominant','limited'], status: 'UNIQUE', winners: [0], decisions: [['LEFT','LEFT','LEFT']], direct: [[0,3],[0,0]], paths: [[0,3],[0,0]] },
  { name: 'tie', files: ['dominant','dominant'], status: 'CO_WINNERS', winners: [0,1], decisions: [['TIE','TIE','TIE']], direct: [[0,0],[0,0]], paths: [[0,0],[0,0]] },
  { name: 'unknown', files: ['dominant','unknown'], status: 'UNRESOLVED', winners: [], decisions: [['UNRESOLVED','UNRESOLVED','UNRESOLVED']], direct: [[0,0],[0,0]], paths: [] },
];
const canonical = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item);
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const equal = (a,b) => canonical(a) === canonical(b);

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!value || typeof value !== 'object') return value;
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'node_config') continue;
    result[key] = /private.?key|api.?key|password|secret|authorization/i.test(key) ? 'REDACTED' : sanitize(item);
  }
  return result;
}
function save(name, value) { fs.writeFileSync(path.join(proofs, name + '.json'), JSON.stringify(sanitize(value), null, 2) + '\n'); }
function result(output) {
  const start = output.indexOf('Result:');
  if (start < 0) throw Error('CLI result missing: ' + output.slice(-300));
  return JSON.parse(output.slice(start + 7).trim());
}
function invoke(label, args, overrides = {}) {
  const file = path.join(journal, label + '.json');
  const prior = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  if (prior.complete && (!['receipt', 'call'].includes(args[0]) || prior.stdout.includes('Result:'))) return Promise.resolve(prior.stdout);
  if (prior.hash && args[0] === 'write') return Promise.resolve('Write Transaction Hash: ' + prior.hash);
  if (prior.hash && args[0] === 'deploy') overrides.CHOICEKERNEL_RESUME_HASH = prior.hash;
  console.log('RUN', label);
  return new Promise((resolve, reject) => {
    const child = cp.spawn(process.execPath, ['--require', hook, cli, ...args], {
      cwd: root, windowsHide: true,
      env: { ...process.env, NO_COLOR: '1', CHOICEKERNEL_ACCOUNT: account, ...overrides },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.end(password + '\n');
    let stdout = '', stderr = '', hash = prior.hash;
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      const found = stdout.match(/(?:Deployment|Write) Transaction Hash:\s*(0x[0-9a-f]{64})/i)?.[1];
      if (found && found !== hash) {
        hash = found;
        fs.writeFileSync(file, JSON.stringify({ hash, complete: false }));
        console.log('SUBMITTED', label, hash);
      }
    });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      fs.writeFileSync(file, JSON.stringify({ hash, complete: code === 0, stdout, stderr }));
      if (code) reject(Error(label + ': ' + stderr.slice(-1200)));
      else resolve(stdout);
    });
  });
}
async function receipt(label, hash) {
  const data = result(await invoke(label + '-receipt', ['receipt', hash, '--retries', '300', '--interval', '3000']));
  save(label + '-receipt', data);
  const status = data.statusName || data.status_name;
  const execution = data.txExecutionResultName || data.consensus_data?.leader_receipt?.[0]?.execution_result;
  if (status !== 'FINALIZED' || data.result_name !== 'MAJORITY_AGREE' || !['SUCCESS', 'FINISHED_WITH_RETURN'].includes(execution)) throw Error(label + ': ' + status + '/' + data.result_name + '/' + execution);
  console.log('FINALIZED', label, hash, execution);
  return data;
}
async function rpc(method, params) {
  const response = await fetch('https://studio.genlayer.com/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok || data.error) throw Error(JSON.stringify(data.error || response.status));
  return data.result;
}

(async () => {
  if (await rpc('eth_chainId', []) !== '0xf22f') throw Error('Unexpected chain ID');
  const accountInfo = await invoke('account', ['account', 'show', '--account', account]);
  if (!accountInfo.toLowerCase().includes(address.toLowerCase())) throw Error('Account mismatch');
  for (const item of cases) {
    const candidates = [];
    const documents = [];
    for (let index=0; index<item.files.length; index++) {
      const file = item.files[index];
      const url = `https://raw.githubusercontent.com/${repo}/${revision}/fixtures/${file}.md`;
      const body = fs.readFileSync(path.join(root, 'fixtures',file+'.md'));
      const upstream = await fetch(url);
      if (!upstream.ok || !body.equals(Buffer.from(await upstream.arrayBuffer()))) throw Error('Published fixture differs: '+file);
      candidates.push({name: 'Alternative '+index, url, sha256: digest(body)});
      documents.push(body.toString());
    }
    const config = {criteria,candidates};
    const configFile = path.join(journal,item.name+'-config.json');
    fs.writeFileSync(configFile,JSON.stringify(config));
    const deployed = result(await invoke(item.name+'-deploy',['deploy'],{CHOICEKERNEL_CONFIG_FILE:configFile}));
    const contract=deployed['Contract Address'], deployHash=deployed['Transaction Hash'];
    await receipt(item.name+'-deploy',deployHash);
    const transactions=[{action:'deploy',hash:deployHash}];
    let position=0;
    for (let left=0;left<candidates.length;left++) {
      for (let right=left+1;right<candidates.length;right++) {
        const label=`${item.name}-${left}-${right}`;
        const output=await invoke(label+'-compare',['write',contract,'compare','--args',String(left),String(right)]);
        const hash=output.match(/Write Transaction Hash:\s*(0x[0-9a-f]{64})/i)?.[1];
        if (!hash) throw Error('Missing comparison hash');
        await receipt(label+'-compare',hash);
        transactions.push({action:'compare',left,right,hash});
        const state=result(await invoke(label+'-state',['call',contract,'get_state']));
        const pair=state.comparisons.find(row=>row.left===left && row.right===right);
        if (state.completed!==position+1 || !pair || !equal(pair.judgments.map(row=>row.decision),item.decisions[position]) || !equal(pair.source_hashes,[candidates[left].sha256,candidates[right].sha256])) throw Error('Unexpected comparison '+label+': '+JSON.stringify(state));
        for (const row of pair.judgments) {
          if ((row.left_quote && !documents[left].includes(row.left_quote)) || (row.right_quote && !documents[right].includes(row.right_quote))) throw Error('Source quote mismatch');
        }
        position++;
        console.log('COMPARISON VERIFIED',label,hash);
      }
    }
    const output=await invoke(item.name+'-finalize',['write',contract,'finalize']);
    const hash=output.match(/Write Transaction Hash:\s*(0x[0-9a-f]{64})/i)?.[1];
    if (!hash) throw Error('Missing finalization hash');
    await receipt(item.name+'-finalize',hash);
    transactions.push({action:'finalize',hash});
    const state=result(await invoke(item.name+'-final-state',['call',contract,'get_state']));
    const outcome=state.outcome;
    if (!equal(state.configuration,config) || state.completed!==state.required || outcome.status!==item.status || !equal(outcome.winners,item.winners) || !equal(outcome.direct_strengths,item.direct) || !equal(outcome.strongest_paths,item.paths) || outcome.comparison_root!==digest(canonical({config,comparisons:state.comparisons}))) throw Error('Unexpected final state '+item.name+': '+JSON.stringify(state));
    const codeOutput=await invoke(item.name+'-code',['code',contract]);
    const start=codeOutput.indexOf('# { "Depends":');
    if (start<0 || codeOutput.slice(start,start+source.length)!==source.toString()) throw Error('Deployed source mismatch');
    save(item.name,{network:'studionet',chain_id:61999,contract_address:contract,source_sha256:sourceHash,exact_source_match:true,fixture_revision:revision,transactions,state});
    console.log('SCENARIO VERIFIED',item.name,item.status,contract);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
