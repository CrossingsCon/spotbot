import dotenv from 'dotenv-safe';
dotenv.config();

import bolt from '@slack/bolt';
import cron from 'cron';

import { getBirthdaysForThisHour } from './lib/birthday.js';

const app = new bolt.App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

/* Add functionality here */
async function pingEli(text) {
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

(async () => {
  // Start the app
  await app.start(process.env.PORT || 3000);

  console.log('⚡️ Bolt app is running!');

  const EVERY_HOUR_AT_1_MINUTE_PAST = '0 1 * * * *';
  const birthdayJob = new cron.CronJob(EVERY_HOUR_AT_1_MINUTE_PAST, async function() {
    const birthdaysThisHour = await getBirthdaysForThisHour(app);
    birthdaysThisHour.forEach(async u => {
      pingEli(`Happy birthday to <@${u.id}>!`);
    });
  }, null, true);
  console.log('📅 Birthdays crontab scheduled!');
})();
