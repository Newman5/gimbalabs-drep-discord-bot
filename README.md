# gimbalabs-drep-discord-bot — quick notes

- Copy .env.example -> .env and set secrets (do not commit .env).
- For fast local testing without hitting the API, set USE_SAMPLE_PROPOSALS=true in .env or pass --sample to the test script.

Quick test script (uses sample when requested):
npx ts-node -r dotenv/config src/scripts/test-pending-proposals.ts --sample

This will print a sample proposal's keys and a truncated JSON so you can confirm json_metadata.body.title/description are available and show up in embeds.