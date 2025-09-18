"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const node_cron_1 = __importDefault(require("node-cron"));
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
    // Schedule job every 5 seconds for testing
    node_cron_1.default.schedule("*/5 * * * * *", async () => {
        const channel = (await client.channels.fetch(CHANNEL_ID));
        if (!channel) {
            console.error("Channel not found!");
            return;
        }
        // Example calculation
        const result = Math.floor(Math.random() * 1000);
        await channel.send(`📊 Daily result: **${result}**`);
    });
});
// Login
client.login(TOKEN);
