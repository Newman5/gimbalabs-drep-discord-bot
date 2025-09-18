"use strict";
/**
 * Gimbalabs DRep utilities for fetching voting information
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGimbalabsDrepVotes = getGimbalabsDrepVotes;
exports.pendingProposalGimbalabsDrepHasNotVotedYet = pendingProposalGimbalabsDrepHasNotVotedYet;
exports.getUnvotedProposalsForDiscord = getUnvotedProposalsForDiscord;
exports.getUnvotedProposalsCount = getUnvotedProposalsCount;
exports.getUnvotedProposalsInfo = getUnvotedProposalsInfo;
const get_proposals_1 = require("./get-proposals");
const GIMBALABS_DREP_ID = 'drep1taxuxp3f9yvw5txzssxx54n6qy73r9ecc40c5mx4wthuw3r3mj6';
/**
 * Fetch all votes cast by Gimbalabs DRep
 * @returns Promise<DRepVote[]> - Array of votes cast by Gimbalabs DRep
 */
async function getGimbalabsDrepVotes() {
    console.log('🗳️ Fetching Gimbalabs DRep votes...');
    try {
        const response = await fetch(`${process.env.BLOCKFROST_API_URL}/governance/dreps/${GIMBALABS_DREP_ID}/votes`, {
            method: 'GET',
            headers: {
                'dmtr-api-key': process.env.API_KEY,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        const votes = await response.json();
        console.log(`✅ Found ${votes.length} votes from Gimbalabs DRep`);
        return votes;
    }
    catch (error) {
        console.error('❌ Error fetching Gimbalabs DRep votes:', error);
        throw error;
    }
}
/**
 * Check which pending proposals Gimbalabs DRep has not voted on yet
 * @returns Promise<any[]> - Array of pending proposals that haven't been voted on by Gimbalabs DRep
 */
async function pendingProposalGimbalabsDrepHasNotVotedYet() {
    console.log('🔍 Checking which pending proposals Gimbalabs DRep has not voted on yet...');
    try {
        // Get pending proposals and DRep votes in parallel
        const [pendingProposals, drepVotes] = await Promise.all([
            (0, get_proposals_1.getPendingProposalsFromAPI)(),
            getGimbalabsDrepVotes()
        ]);
        console.log(`📋 Found ${pendingProposals.length} pending proposals`);
        console.log(`🗳️ Found ${drepVotes.length} DRep votes`);
        // Create a set of transaction hashes that the DRep has voted on
        const votedTxHashes = new Set(drepVotes.map(vote => vote.tx_hash));
        // Filter pending proposals to find those not voted on
        const unvotedProposals = pendingProposals.filter(proposal => {
            const proposalTxHash = proposal.tx_hash;
            return !votedTxHashes.has(proposalTxHash);
        });
        console.log(`📊 Found ${unvotedProposals.length} pending proposals that Gimbalabs DRep has not voted on yet`);
        return unvotedProposals;
    }
    catch (error) {
        console.error('❌ Error checking unvoted proposals:', error);
        throw error;
    }
}
/**
 * Get Discord embeds for pending proposals that Gimbalabs DRep has not voted on yet
 * @param maxProposals - Maximum number of proposals to include (default: 10)
 * @returns Promise<any[]> - Array of formatted Discord embeds
 */
async function getUnvotedProposalsForDiscord(maxProposals = 10) {
    try {
        const unvotedProposals = await pendingProposalGimbalabsDrepHasNotVotedYet();
        if (unvotedProposals.length === 0) {
            return [{
                    title: '✅ All Caught Up!',
                    description: 'Gimbalabs DRep has voted on all pending proposals.',
                    color: 0x2ecc71,
                    timestamp: new Date().toISOString(),
                    footer: {
                        text: `Gimbalabs DRep: ${GIMBALABS_DREP_ID.substring(0, 20)}...`
                    }
                }];
        }
        const embeds = [];
        // Summary embed
        embeds.push({
            title: '🔍 Pending Proposals - Votes Needed',
            description: `Found ${unvotedProposals.length} pending proposal(s) that Gimbalabs DRep has not voted on yet.`,
            fields: [
                {
                    name: '📊 Total Unvoted',
                    value: unvotedProposals.length.toString(),
                    inline: true
                },
                {
                    name: '🏛️ DRep ID',
                    value: `\`${GIMBALABS_DREP_ID.substring(0, 20)}...\``,
                    inline: true
                }
            ],
            color: 0xf39c12,
            timestamp: new Date().toISOString()
        });
        // Individual proposal embeds (limited by maxProposals)
        const limitedProposals = unvotedProposals.slice(0, maxProposals);
        limitedProposals.forEach((proposal, index) => {
            embeds.push({
                title: `⏳ Unvoted Proposal #${index + 1}`,
                fields: [
                    {
                        name: 'Transaction Hash',
                        value: `\`${proposal.tx_hash.substring(0, 16)}...\``,
                        inline: true
                    },
                    {
                        name: 'Certificate Index',
                        value: proposal.cert_index.toString(),
                        inline: true
                    },
                    {
                        name: 'Governance Action',
                        value: proposal.governance_action_type || 'Unknown',
                        inline: true
                    },
                    {
                        name: 'Expiry Epoch',
                        value: proposal.expiry_epoch?.toString() || 'Unknown',
                        inline: true
                    },
                    {
                        name: 'Deposit (ADA)',
                        value: proposal.deposit ? `${(parseInt(proposal.deposit) / 1000000).toLocaleString()}` : 'Unknown',
                        inline: true
                    }
                ],
                color: 0xe67e22,
                timestamp: new Date().toISOString()
            });
        });
        return embeds;
    }
    catch (error) {
        console.error('❌ Error formatting unvoted proposals for Discord:', error);
        return [{
                title: '❌ Error',
                description: 'Failed to fetch unvoted proposals.',
                color: 0xe74c3c,
                timestamp: new Date().toISOString()
            }];
    }
}
/**
 * Get count of pending proposals that Gimbalabs DRep has not voted on yet
 * @returns Promise<number> - Count of unvoted pending proposals
 */
async function getUnvotedProposalsCount() {
    try {
        const unvotedProposals = await pendingProposalGimbalabsDrepHasNotVotedYet();
        return unvotedProposals.length;
    }
    catch (error) {
        console.error('❌ Error getting unvoted proposals count:', error);
        return 0;
    }
}
/**
 * Get both count and details of pending proposals that Gimbalabs DRep has not voted on yet
 * @returns Promise<{count: number, proposals: any[]}> - Object containing count and proposal details
 */
async function getUnvotedProposalsInfo() {
    try {
        const unvotedProposals = await pendingProposalGimbalabsDrepHasNotVotedYet();
        return {
            count: unvotedProposals.length,
            proposals: unvotedProposals
        };
    }
    catch (error) {
        console.error('❌ Error getting unvoted proposals info:', error);
        return {
            count: 0,
            proposals: []
        };
    }
}
