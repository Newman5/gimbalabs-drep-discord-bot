import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import cron from "node-cron";
import { getUnvotedProposalsForDiscord, getUnvotedProposalsInfo } from "./gimbalabs-drep";

// Load from environment variables
const TOKEN = process.env.DISCORD_TOKEN as string;
const CHANNEL_ID = process.env.CHANNEL_ID as string;

// Set API environment variables for gimbalabs-drep functions
process.env.BLOCKFROST_API_URL = process.env.BLOCKFROST_API_URL || "https://blockfrost-m1.demeter.run";
process.env.API_KEY = process.env.API_KEY || "blockfrost1c4y8cytdtdp22s95hul";

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

      // Get unvoted proposals info (count and details)
      const unvotedInfo = await getUnvotedProposalsInfo();
      
      if (unvotedInfo.count === 0) {
        console.log("✅ Gimbalabs DRep has voted on all pending proposals.");
        await channel.send("✅ **All caught up! Gimbalabs DRep has voted on all pending proposals.**");
      } else {
        console.log(`� Found ${unvotedInfo.count} proposal(s) that Gimbalabs DRep has not voted on yet`);
        
        // Send header message with count
        await channel.send(`🚨 **VOTES NEEDED**: ${unvotedInfo.count} pending proposal(s) require Gimbalabs DRep votes!`);
        
        // Get Discord embeds for unvoted proposals
        const unvotedEmbeds = await getUnvotedProposalsForDiscord(10); // Max 10 proposals
        
        // Send each embed
        for (const embed of unvotedEmbeds) {
          await channel.send({ embeds: [embed] });
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // If there are more than 10 unvoted proposals, show a summary
        if (unvotedInfo.count > 10) {
          await channel.send(`📋 **Note**: Showing first 10 of ${unvotedInfo.count} total unvoted proposals.`);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching unvoted proposals:", error);
      const channel = (await client.channels.fetch(CHANNEL_ID)) as TextChannel;
      if (channel) {
        await channel.send("❌ **Error fetching unvoted proposals. Please check logs.**");
      }
    }
  });
});

// Login
client.login(TOKEN);
