import cron from 'cron';
import moment from 'moment-timezone';

import logger from './logger.js';

import { pageThrough } from './page-through.js';
import { randomInt } from './random.js';

const SPOTLIGHT_BLOCKLIST = [];
const SPOTLIGHT_ADDLIST = []; // TODO: implement this

const EVERY_DAY_AT_NOON = '0 0 12 * * *';
export async function startChannelSpotightCronjob(app, store) {
  const channelSpotightJob = new cron.CronJob(EVERY_DAY_AT_NOON, async function() {
    logger.info('💡 Deciding which channel to spotight...');
    const channelToSpotight = await decideWhichChannelToSpotight(app, store);
    logger.info(`🔦 Putting the spotlight on #${channelToSpotight.name}`);
    await postChannelSpotightInGeneral(app, channelToSpotight);
    await markChannelAsSpotighted(store, channelToSpotight);
  }, null, true);

  logger.info('🏅 Channel spotight cronjob scheduled!');
}

async function decideWhichChannelToSpotight(app, store) {
  const spotightedChannels = (await store.get('spotightedChannels')) || {};
  // disqualify channels spotighted in the last 30 days
  const THIRTY_DAYS_AGO = moment().subtract(30, 'days');
  const recentlySpotighted = Object.keys(spotightedChannels)
    .filter(channelName => THIRTY_DAYS_AGO.isSameOrAfter(spotightedChannels[channelName], 'day'));

  let publicChannels = await pageThrough(async function(nextCursor) {
    return app.client.conversations.list({
      token: process.env.SLACK_BOT_TOKEN,
      type: 'public_channel',
      exclude_archived: true,
      cursor: nextCursor,
    });
  }, 'channels');

  const disqualifiedChannels = [...HIGHLIGHT_BLOCKLIST, ...recentlySpotighted];
  publicChannels = publicChannels.filter(channel => !disqualifiedChannels.includes(channel.name));

  // ...and the lucky winner is...
  if(publicChannels.length === 0) {
    logger.warn(`No public channels left to spotight after filtering!`);
    return null;
  }
  return publicChannels[randomInt(0, publicChannels.length)];
}

async function postChannelSpotightInGeneral(app, channel) {
  const message = `Today's channel spotlight goes to <#${channel.id}>! The current topic of <#${channel.id}> is: ${channel.topic.value || '...a mystery!'} If that sounds interesting to you, why not join the conversation?`;
  return pingEli(app, message);
}

async function markChannelAsSpotighted(store, channel) {
  const spotightedChannels = (await store.get('spotightedChannels')) || {};
  spotightedChannels[channel.name] = moment().format('YYYY-MM-DD');
  return store.set('spotightedChannels', spotightedChannels);
}

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
