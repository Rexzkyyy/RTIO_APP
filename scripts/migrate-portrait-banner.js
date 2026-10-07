const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DIRECT_URL });

async function run() {
  await client.connect();
  try {
    await client.query('ALTER TABLE "Event" ADD COLUMN "bannerPortraitUrl" TEXT;');
    console.log('Column added successfully');
  } catch(e) {
    console.error(e.message);
  } finally {
    await client.end();
  }
}
run();
