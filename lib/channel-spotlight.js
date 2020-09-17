import cron from 'cron';
import moment from 'moment-timezone';

import logger from './logger.js';

import CHANNELS from '../config/channels.js';

import { pageThrough } from './page-through.js';
import { randomInt } from './random.js';

const SPOTLIGHT_BLOCKLIST = [];
const SPOTLIGHT_ADDLIST = []; // TODO: implement this

const EVERY_FRIDAY_AT_NOON = '0 0 12 * * 5';
export async function startChannelSpotightCronjob(app, store) {
  const channelSpotightJob = new cron.CronJob(EVERY_FRIDAY_AT_NOON, async function() {
    logger.info('💡 Deciding which channel to spotight...');
    const channelToSpotight = await decideWhichChannelToSpotight(app, store);
    logger.info(`🔦 Putting the spotlight on #${channelToSpotight.name}`);
    await announceChannelSpotlight(app, channelToSpotight);
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

  const disqualifiedChannels = [...SPOTLIGHT_BLOCKLIST, ...recentlySpotighted];
  publicChannels = publicChannels.filter(channel => !disqualifiedChannels.includes(channel.name));

  // ...and the lucky winner is...
  if(publicChannels.length === 0) {
    logger.warn(`No public channels left to spotight after filtering!`);
    return null;
  }
  return publicChannels[randomInt(0, publicChannels.length)];
}

async function announceChannelSpotlight(app, channel) {
  return app.client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    channel: CHANNELS.channelSpotlight,
    blocks: formatChannelSpotlightAnnouncement(channel),
  });
}

function formatChannelSpotlightAnnouncement(channel) {
  // TODO: vary the "if that sounds interesting..." message
  const blocks = [
    { type: 'section', text: { text: `:flashlight: Today's channel spotlight goes to *<#${channel.id}>*!`, type: 'mrkdwn' } },
    { type: 'section', text: { text: `*Purpose:* ${channel.purpose.value || '...a mystery!'}`, type: 'mrkdwn' } },
    { type: 'section', text: { text: `*Topic:* ${channel.topic.value || '...a mystery!'}`, type: 'mrkdwn' } },
    { type: 'context', elements: [{ text: `If that sounds interesting, why not hop in and say hi?`, type: 'plain_text', emoji: true }] },
  ];

  return blocks;
}

async function markChannelAsSpotighted(store, channel) {
  const spotightedChannels = (await store.get('spotightedChannels')) || {};
  spotightedChannels[channel.name] = moment().format('YYYY-MM-DD');
  return store.set('spotightedChannels', spotightedChannels);
}
