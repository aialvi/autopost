// Unit tests never inherit a development/production database by accident.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else delete process.env.DATABASE_URL;
process.env.ENCRYPTION_KEY = "a".repeat(64);
process.env.AI_PROVIDER = "gemini";
delete process.env.GEMINI_API_KEY;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.TELEGRAM_BOT_TOKEN;
