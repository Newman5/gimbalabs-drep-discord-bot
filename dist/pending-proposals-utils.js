"use strict";
/**
 * Simple utility functions for working with pending proposals
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPendingProposalsForDiscord = getPendingProposalsForDiscord;
const get_proposals_1 = require("./get-proposals");
/**
 * Get pending proposals formatted for Discord embed
 * @param maxProposals - Maximum number of proposals to include (default: 5)
 * @param useAPI - Whether to fetch from API (true) or file (false, default)
 * @returns Promise<any[]> - Array of formatted proposal objects for Discord embeds
 */
async function getPendingProposalsForDiscord(maxProposals = 5) {
    try {
        const pendingProposals = await (0, get_proposals_1.getPendingProposalsFromAPI)();
        return pendingProposals.slice(0, maxProposals).map((proposal, index) => ({
            title: `Pending Proposal #${index + 1}`,
            fields: [
                {
                    name: 'Transaction Hash',
                    value: `\`${proposal.tx_hash}\``,
                    inline: false
                },
                {
                    name: 'Certificate Index',
                    value: proposal.cert_index.toString(),
                    inline: true
                },
                {
                    name: 'Type',
                    value: proposal.governance_type || 'Unknown',
                    inline: true
                },
                {
                    name: 'Description',
                    value: proposal.governance_description?.tag || 'N/A',
                    inline: true
                },
                {
                    name: 'Deposit',
                    value: `${Number(proposal.deposit || 0) / 1000000} ADA`,
                    inline: true
                }
            ],
            color: 0x0099ff,
            timestamp: new Date().toISOString()
        }));
    }
    catch (error) {
        console.error('Error getting pending proposals for Discord:', error);
        return [{
                title: 'Error',
                description: 'Could not fetch pending proposals',
                color: 0xff0000,
                timestamp: new Date().toISOString()
            }];
    }
}
