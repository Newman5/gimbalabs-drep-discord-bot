"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const node_cron_1 = __importDefault(require("node-cron"));
const gimbalabs_drep_1 = require("./gimbalabs-drep");
// Load from environment variables
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
if (!TOKEN || !CHANNEL_ID) {
    throw new Error("Missing DISCORD_TOKEN or CHANNEL_ID in environment variables");
}
/**
 * Generate Discord embeds from already-fetched unvoted proposals data
 * This avoids redundant API calls by reusing data we already have
 */
function generateEmbedsFromUnvotedProposals(unvotedProposals, maxProposals = 10) {
    if (unvotedProposals.length === 0) {
        return [{
                title: '✅ All Caught Up!',
                description: 'Gimbalabs DRep has voted on all pending proposals.',
                color: 0x2ecc71,
                timestamp: new Date().toISOString()
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
                    value: proposal.governance_type || 'Unknown',
                    inline: true
                },
                {
                    name: 'Expiry Epoch',
                    value: proposal.expiration?.toString() || 'Unknown',
                    inline: true
                },
                {
                    name: 'GovTool',
                    value: `[Link](https://gov.tools/governance_actions/${proposal.tx_hash}#${proposal.cert_index})`,
                    inline: true
                }
            ],
            color: 0xe67e22,
            timestamp: new Date().toISOString()
        });
    });
    return embeds;
}
// Create bot client
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessages],
});
// When bot is ready
client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user?.tag}`);
    // Schedule job every 5 minutes to check for pending proposals
    node_cron_1.default.schedule("*/5 * * * *", async () => {
        console.log("🔍 Checking for pending proposals...");
        try {
            const channel = (await client.channels.fetch(CHANNEL_ID));
            if (!channel) {
                console.error("Channel not found!");
                return;
            }
            // OPTIMIZED: Get unvoted proposals once and reuse the data
            // This eliminates redundant API calls by avoiding duplicate data fetching
            const unvotedProposals = await (0, gimbalabs_drep_1.pendingProposalGimbalabsDrepHasNotVotedYet)();
            if (unvotedProposals.length === 0) {
                console.log("✅ Gimbalabs DRep has voted on all pending proposals.");
                await channel.send("✅ **All caught up! Gimbalabs DRep has voted on all pending proposals.**");
            }
            else {
                console.log(`� Found ${unvotedProposals.length} proposal(s) that Gimbalabs DRep has not voted on yet`);
                // Send header message with count
                await channel.send(`🚨 **VOTES NEEDED**: ${unvotedProposals.length} pending proposal(s) require Gimbalabs DRep votes!`);
                // Generate Discord embeds from the already-fetched data (no additional API calls)
                const embeds = generateEmbedsFromUnvotedProposals(unvotedProposals, 10);
                // Send each embed
                for (const embed of embeds) {
                    await channel.send({ embeds: [embed] });
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                // If there are more than 10 unvoted proposals, show a summary
                if (unvotedProposals.length > 10) {
                    await channel.send(`📋 **Note**: Showing first 10 of ${unvotedProposals.length} total unvoted proposals.`);
                }
            }
        }
        catch (error) {
            console.error("❌ Error fetching unvoted proposals:", error);
            const channel = (await client.channels.fetch(CHANNEL_ID));
            if (channel) {
                await channel.send("❌ **Error fetching unvoted proposals. Please check logs.**");
            }
        }
    });
});
// Login
client.login(TOKEN);
