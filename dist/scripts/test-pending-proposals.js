"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const get_proposals_1 = require("../get-proposals");
async function main() {
    const cliSample = process.argv.includes('--sample');
    try {
        const proposals = await (0, get_proposals_1.getPendingProposals)(cliSample);
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
    }
    catch (err) {
        console.error('Error in test script:', err);
        process.exit(1);
    }
}
main();
