import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import cron from "node-cron";

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

    // Schedule job every 5 seconds for testing
    cron.schedule("*/5 * * * * *", async () => {
    const channel = (await client.channels.fetch(CHANNEL_ID)) as TextChannel;

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
