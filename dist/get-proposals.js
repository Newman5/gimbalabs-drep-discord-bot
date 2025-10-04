"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllProposals = getAllProposals;
exports.getProposalByTxHashAndCertIndex = getProposalByTxHashAndCertIndex;
exports.getPendingProposalsFromAPI = getPendingProposalsFromAPI;
exports.loadSampleProposalsFromFile = loadSampleProposalsFromFile;
exports.inspectLocalSample = inspectLocalSample;
exports.getPendingProposals = getPendingProposals;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
/**
 * Fetches a single page of proposals
 * @param page - Page number (1-based)
 * @param count - Number of results per page (1-100, default 100)
 * @returns Promise<any[]> - Array of proposals for this page
 */
async function fetchProposalsPage(page = 1, count = 100) {
    try {
        const url = new URL(`${process.env.BLOCKFROST_API_URL}/governance/proposals`);
        url.searchParams.append('page', page.toString());
        url.searchParams.append('count', count.toString());
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'dmtr-api-key': process.env.API_KEY,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    }
    catch (error) {
        console.error(`Error fetching proposals page ${page}:`, error);
        throw new Error(`Failed to fetch proposals page ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Fetches all governance proposals from Blockfrost API using pagination
 * @returns Promise<any[]> - Array of all proposals
 */
async function getAllProposals() {
    const allProposals = [];
    let page = 1;
    const count = 100; // Maximum items per page
    console.log('Starting to fetch all proposals with pagination...');
    try {
        while (true) {
            console.log(`Fetching page ${page}...`);
            const pageProposals = await fetchProposalsPage(page, count);
            if (pageProposals.length === 0) {
                // No more proposals, we've reached the end
                console.log(`No more proposals found on page ${page}. Stopping.`);
                break;
            }
            allProposals.push(...pageProposals);
            console.log(`Page ${page}: Found ${pageProposals.length} proposals. Total so far: ${allProposals.length}`);
            // If we got fewer proposals than the count, we've reached the last page
            if (pageProposals.length < count) {
                console.log(`Last page reached (got ${pageProposals.length} < ${count} proposals).`);
                break;
            }
            page++;
            // Add a small delay between requests to be respectful to the API
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        console.log(`✅ Finished fetching all proposals. Total: ${allProposals.length}`);
        return allProposals;
    }
    catch (error) {
        console.error('Error fetching all proposals:', error);
        throw new Error(`Failed to fetch all proposals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Fetches a specific proposal by transaction hash and certificate index
 * @param txHash - Transaction hash of the proposal
 * @param certIndex - Certificate index of the proposal
 * @returns Promise<any | null> - The proposal details or null if not found
 */
async function getProposalByTxHashAndCertIndex(txHash, certIndex) {
    try {
        const url = `${process.env.BLOCKFROST_API_URL}/governance/proposals/${txHash}/${certIndex}`;
        console.log(`Fetching proposal: ${txHash}/${certIndex}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'dmtr-api-key': process.env.API_KEY,
                'Content-Type': 'application/json',
            },
        });
        if (response.status === 404) {
            console.log(`Proposal ${txHash}/${certIndex} not found`);
            return null; // Proposal not found
        }
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`✅ Found proposal: ${txHash}/${certIndex}`);
        return data;
    }
    catch (error) {
        console.error(`Error fetching proposal ${txHash}/${certIndex}:`, error);
        throw new Error(`Failed to fetch proposal ${txHash}/${certIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Determines if a proposal is pending (not ratified, enacted, dropped, or expired)
 * @param proposal - The proposal object to check
 * @returns boolean - True if the proposal is pending
 */
function isPendingProposal(proposal) {
    return ((proposal.ratified_epoch === null ||
        proposal.ratified_epoch === undefined) &&
        (proposal.enacted_epoch === null || proposal.enacted_epoch === undefined) &&
        (proposal.dropped_epoch === null || proposal.dropped_epoch === undefined) &&
        (proposal.expired_epoch === null || proposal.expired_epoch === undefined));
}
/**
 * Gets pending proposals directly from API (no file storage required)
 * This is a simplified version that fetches fresh data from the API
 * @returns Promise<any[]> - Array of pending proposals with detailed information
 */
async function getPendingProposalsFromAPI() {
    try {
        console.log('🔍 Fetching all proposals from API...');
        // Step 1: Get all basic proposals
        const basicProposals = await getAllProposals();
        console.log(`📥 Found ${basicProposals.length} total proposals`);
        // Step 2: Fetch detailed info for each proposal to determine status
        console.log('🔍 Fetching detailed information to determine pending status...');
        const pendingProposals = [];
        for (let i = 0; i < basicProposals.length; i++) {
            const basicProposal = basicProposals[i];
            try {
                const detailedProposal = await getProposalByTxHashAndCertIndex(basicProposal.tx_hash, basicProposal.cert_index);
                if (detailedProposal && isPendingProposal(detailedProposal)) {
                    pendingProposals.push(detailedProposal);
                    console.log(`✅ Found pending: ${basicProposal.tx_hash}/${basicProposal.cert_index}`);
                }
                // Small delay to be respectful to API
                if (i < basicProposals.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 150));
                }
            }
            catch (error) {
                console.warn(`⚠️ Failed to get details for ${basicProposal.tx_hash}/${basicProposal.cert_index}:`, error);
                // Skip this proposal if we can't get detailed info
            }
        }
        console.log(`✅ Found ${pendingProposals.length} pending proposals`);
        return pendingProposals;
    }
    catch (error) {
        console.error('Error fetching pending proposals from API:', error);
        throw new Error(`Failed to fetch pending proposals from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Load sample proposals from a local file for fast testing (returns array)
 */
async function loadSampleProposalsFromFile(filePath) {
    const p = filePath ||
        path_1.default.resolve(__dirname, '..', 'personal', 'proposal-metadata.json');
    try {
        const raw = await promises_1.default.readFile(p, 'utf8');
        const parsed = JSON.parse(raw);
        // If file is a single metadata object, wrap in an array so callers get a list
        return Array.isArray(parsed) ? parsed : [parsed];
    }
    catch (err) {
        console.error(`❌ Failed to load sample proposals from ${p}:`, err);
        return [];
    }
}
/**
 * Inspect a sample proposal without hitting the API
 */
async function inspectLocalSample(sampleIndex = 0) {
    const list = await loadSampleProposalsFromFile();
    console.log('Local sample count:', list.length);
    const sample = list[sampleIndex];
    if (!sample) {
        console.log('No sample available at index', sampleIndex);
        return null;
    }
    console.log('Sample keys:', Object.keys(sample));
    console.log('Sample JSON:', JSON.stringify(sample, null, 2));
    return sample;
}
// --- ADDED: unified helper to choose sample vs API ---
/**
 * Get pending proposals, either from local sample file or from API.
 * Priority: explicit arg > USE_SAMPLE_PROPOSALS env var (true/false) > false (API)
 * @param useSample - optional override to force using local sample
 */
async function getPendingProposals(useSample) {
    const envFlag = String(process.env.USE_SAMPLE_PROPOSALS || '').toLowerCase();
    const use = typeof useSample === 'boolean'
        ? useSample
        : envFlag === '1' || envFlag === 'true' || envFlag === 'yes';
    if (use) {
        console.log('Using local sample proposals for testing (getPendingProposals).');
        const samples = await loadSampleProposalsFromFile();
        // try to normalize to the "detailed proposal" shape expected by callers:
        // if the sample is a metadata object, return as-is; otherwise return list.
        return samples;
    }
    else {
        console.log('Fetching pending proposals from API (getPendingProposals).');
        return await getPendingProposalsFromAPI();
    }
}
// If run directly with ts-node: `npx ts-node src/get-proposals.ts`
if (typeof require !== 'undefined' && require.main === module) {
    (async () => {
        await inspectLocalSample(0);
        process.exit(0);
    })();
}
