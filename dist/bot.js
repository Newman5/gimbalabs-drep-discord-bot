"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const node_cron_1 = __importDefault(require("node-cron"));
const pending_proposals_utils_1 = require("./pending-proposals-utils");
// Load from environment variables
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
if (!TOKEN || !CHANNEL_ID) {
    throw new Error("Missing DISCORD_TOKEN or CHANNEL_ID in environment variables");
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
            // Get all pending proposals from API (real-time data)
            const embeds = await (0, pending_proposals_utils_1.getPendingProposalsForDiscord)(100); // 100 max (effectively all), use API
            if (embeds.length === 0) {
                console.log("📝 No pending proposals found.");
                await channel.send("📝 **No pending proposals at this time.**");
            }
            else {
                console.log(`📊 Found ${embeds.length} pending proposal(s)`);
                await channel.send("🏛️ **Current Pending Proposals:**");
                // Send each proposal as a separate embed
                for (const embed of embeds) {
                    await channel.send({ embeds: [embed] });
                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
        catch (error) {
            console.error("❌ Error fetching pending proposals:", error);
            const channel = (await client.channels.fetch(CHANNEL_ID));
            if (channel) {
                await channel.send("❌ **Error fetching pending proposals. Please check logs.**");
            }
        }
    });
});
// Login
client.login(TOKEN);
