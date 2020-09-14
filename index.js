import dotenv from 'dotenv-safe';
dotenv.config();

import bolt from '@slack/bolt';
import cron from 'cron';

import Store from './lib/store.js';
import { startBirthdayCronjob } from './lib/birthday.js';
import { startChannelHighlightCronjob } from './lib/channel-highlight.js';

const store = new Store();

const app = new bolt.App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ SpotBot is running!');

  startBirthdayCronjob(app);
  startChannelHighlightCronjob(app, store);
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
