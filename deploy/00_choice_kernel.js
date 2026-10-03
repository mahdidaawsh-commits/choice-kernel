const fs = require('node:fs');
const path = require('node:path');

module.exports = async function deployChoiceKernel(client) {
  const config = JSON.parse(fs.readFileSync(process.env.CHOICEKERNEL_CONFIG_FILE, 'utf8'));
  const code = fs.readFileSync(path.join(__dirname, '../contracts/choice_kernel.py'), 'utf8');
  const hash = process.env.CHOICEKERNEL_RESUME_HASH || await client.deployContract({ code, args: [JSON.stringify(config.criteria), JSON.stringify(config.candidates)], leaderOnly: false });
  console.log('Deployment Transaction Hash:', hash);
  const receipt = await client.waitForTransactionReceipt({ hash, retries: 300, interval: 3000, status: 'FINALIZED' });
  const execution = receipt.consensus_data?.leader_receipt?.[0]?.execution_result ?? receipt.txExecutionResultName;
  if ((receipt.status_name || receipt.statusName || receipt.status) !== 'FINALIZED' || !['SUCCESS', 'FINISHED_WITH_RETURN'].includes(execution)) throw Error('Deployment failed: ' + execution);
  const address = receipt.data?.contract_address ?? receipt.txDataDecoded?.contractAddress;
  if (!/^0x[0-9a-f]{40}$/i.test(address || '')) throw Error('Deployment address missing.');
  console.log('Result:', { 'Transaction Hash': hash, 'Contract Address': address });
};
