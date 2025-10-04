"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const node_cron_1 = __importDefault(require("node-cron"));
const express_1 = __importDefault(require("express")); // 👈 add express
const gimbalabs_drep_1 = require("./gimbalabs-drep");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Load from environment variables
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
if (!TOKEN || !CHANNEL_ID) {
    throw new Error("Missing DISCORD_TOKEN or CHANNEL_ID in environment variables");
}
/**
 * Generate Discord embeds from already-fetched unvoted proposals data
 */
function generateEmbedsFromUnvotedProposals(unvotedProposals, maxProposals = 10) {
    if (unvotedProposals.length === 0) {
        return [
            {
                title: '✅ All Caught Up!',
                description: 'Gimbalabs DRep has voted on all pending proposals.',
                color: 0x2ecc71,
                timestamp: new Date().toISOString(),
            },
        ];
    }
    // safe truncator for embed text (Discord limits: description ~4096, field value ~1024)
    const truncate = (s, n = 1024) => s ? (s.length > n ? s.slice(0, n - 1) + '…' : s) : undefined;
    const embeds = [];
    const limitedProposals = unvotedProposals.slice(0, maxProposals);
    limitedProposals.forEach((proposal, index) => {
        // prefer enriched title/abstract if present
        const proposalTitle = proposal.title ||
            proposal.json_metadata?.body?.title ||
            `⏳ Unvoted Proposal #${index + 1}`;
        const proposalAbstract = proposal.abstract || proposal.json_metadata?.body?.abstract;
        embeds.push({
            title: proposalTitle,
            // include a truncated abstract/description to show proposal body summary
            description: truncate(proposalAbstract, 2048),
            fields: [
                {
                    name: 'Transaction Hash',
                    value: `\`...${proposal.tx_hash.slice(-8)}\``,
                    inline: true,
                },
                {
                    name: 'Certificate Index',
                    value: proposal.cert_index.toString(),
                    inline: true,
                },
                {
                    name: 'Governance Action',
                    value: proposal.governance_type || 'Unknown',
                    inline: true,
                },
                {
                    name: 'Expiry Epoch',
                    value: proposal.expiration?.toString() || 'Unknown',
                    inline: true,
                },
                // include a Summary field (not inline) with a shorter truncation to stay within field limits
                ...(proposalAbstract
                    ? [
                        {
                            name: 'Summary',
                            value: truncate(proposalAbstract, 1024),
                            inline: false,
                        },
                    ]
                    : []),
                {
                    name: 'GovTool',
                    value: `[Link](https://gov.tools/governance_actions/${proposal.tx_hash}#${proposal.cert_index})`,
                    inline: true,
                },
            ],
            color: 0xe67e22,
            timestamp: new Date().toISOString(),
        });
    });
    return embeds;
}
// 🔄 Shared logic
async function checkProposalsAndSend(client) {
    console.log("🔍 Checking for pending proposals...");
    try {
        const channel = (await client.channels.fetch(CHANNEL_ID));
        if (!channel) {
            console.error("Channel not found!");
            return;
        }
        const unvotedProposals = await (0, gimbalabs_drep_1.pendingProposalGimbalabsDrepHasNotVotedYet)();
        if (unvotedProposals.length === 0) {
            console.log("✅ All caught up.");
            await channel.send("✅ **All caught up! Gimbalabs DRep has voted on all pending proposals.**");
        }
        else {
            console.log(`🚨 Found ${unvotedProposals.length} unvoted proposal(s).`);
            await channel.send(`🚨 **VOTES NEEDED**: ${unvotedProposals.length} proposal(s) require Gimbalabs DRep votes!`);
            const embeds = generateEmbedsFromUnvotedProposals(unvotedProposals, 10);
            for (const embed of embeds) {
                await channel.send({ embeds: [embed] });
                await new Promise((r) => setTimeout(r, 500)); // avoid rate limits
            }
            if (unvotedProposals.length > 10) {
                await channel.send(`📋 **Note**: Showing first 10 of ${unvotedProposals.length} proposals.`);
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
}
// Create bot client
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessages],
});
// When bot is ready
client.once("ready", async () => {
    console.log(`✅ Logged in as ${client.user?.tag}`);
    // Do the check immediately
    await checkProposalsAndSend(client);
    // Schedule to run daily at 00:00 UTC
    node_cron_1.default.schedule("0 0 * * *", async () => {
        await checkProposalsAndSend(client);
    }, { timezone: "UTC" });
});
// Login
client.login(TOKEN);
// 👇 ADD THIS: tiny express server to keep Render happy
const app = (0, express_1.default)();
app.get("/", (_, res) => res.send("Bot is running ✅"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌍 Express server running on port ${PORT}`);
});
