import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import dotenv from 'dotenv-safe';
dotenv.config({
  path: __dirname + '/.env',
  example: __dirname + '/.env.example',
});

import { logger, setLogLevel } from './lib/logger.js';
setLogLevel(process.env.LOG_LEVEL);

import Store from './lib/store.js';
const store = new Store();


import bolt from '@slack/bolt';
import NullReceiver from './lib/null-receiver.js';
import { startBirthdayCronjob } from './lib/birthday.js';
import { startChannelSpotlightCronjob } from './lib/channel-spotlight.js';


const app = new bolt.App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  receiver: new NullReceiver(),
});

(async () => {
  await app.start(process.env.PORT || 3000);
  logger.info('⚡️ SpotBot is running!');

  startBirthdayCronjob(app);
  startChannelSpotlightCronjob(app, store);
})();

async function pingEli(app, text) {
  const openResponse = await app.client.conversations.open({
    token: process.env.SLACK_BOT_TOKEN,
    users: process.env.STARTUP_PING_TARGET_UID,
  });
  const post = await app.client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    channel: openResponse.channel.id,
    text,
  });
}
