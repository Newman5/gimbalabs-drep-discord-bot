import dotenv from 'dotenv';
dotenv.config();

import { getPendingProposals } from '../get-proposals';

async function main() {
  const cliSample = process.argv.includes('--sample');
  try {
    const proposals = await getPendingProposals(cliSample);
    console.log(`Total proposals returned: ${proposals.length}`);
    const sample = proposals[0];
    if (!sample) {
      console.log('No sample proposal available.');
      process.exit(0);
    }
    console.log('Sample keys:', Object.keys(sample));
    // pretty print a trimmed JSON to avoid huge logs; increase depth if needed
    const pretty = JSON.stringify(sample, null, 2);
    console.log('Sample JSON (truncated to 2000 chars):\n', pretty.slice(0, 2000));
  } catch (err) {
    console.error('Error in test script:', err);
    process.exit(1);
  }
}

main();