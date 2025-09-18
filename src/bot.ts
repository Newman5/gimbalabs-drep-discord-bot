import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import cron from "node-cron";
import { getPendingProposalsForDiscord } from "./pending-proposals-utils";

// Load from environment variables
const TOKEN = process.env.DISCORD_TOKEN as string;
const CHANNEL_ID = process.env.CHANNEL_ID as string;

if (!TOKEN || !CHANNEL_ID) {
  throw new Error("Missing DISCORD_TOKEN or CHANNEL_ID in environment variables");
}

// Create bot client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// When bot is ready
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);

  // Schedule job every 5 minutes to check for pending proposals
  cron.schedule("*/5 * * * *", async () => {
    console.log("🔍 Checking for pending proposals...");
    
    try {
      const channel = (await client.channels.fetch(CHANNEL_ID)) as TextChannel;

      if (!channel) {
        console.error("Channel not found!");
        return;
      }

      // Get all pending proposals from API (real-time data)
      const embeds = await getPendingProposalsForDiscord(100); // 100 max (effectively all), use API

      if (embeds.length === 0) {
        console.log("📝 No pending proposals found.");
        await channel.send("📝 **No pending proposals at this time.**");
      } else {
        console.log(`📊 Found ${embeds.length} pending proposal(s)`);
        await channel.send("🏛️ **Current Pending Proposals:**");
        
        // Send each proposal as a separate embed
        for (const embed of embeds) {
          await channel.send({ embeds: [embed] });
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("❌ Error fetching pending proposals:", error);
      const channel = (await client.channels.fetch(CHANNEL_ID)) as TextChannel;
      if (channel) {
        await channel.send("❌ **Error fetching pending proposals. Please check logs.**");
      }
    }
  });
});

// Login
client.login(TOKEN);
