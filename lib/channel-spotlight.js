import cron from 'cron';
import moment from 'moment-timezone';

import logger from './logger.js';

import CHANNELS from '../config/channels.js';

import { pageThrough } from './page-through.js';
import { randomInt } from './random.js';

const SPOTLIGHT_BLOCKLIST = [
  '-',
  'announcements',
  'general',
  'random',
  'spoilers-',
];
const SPOTLIGHT_ADDLIST = []; // TODO: implement this

const FIRST_DAY_OF_EVERY_MONTH = '20 54 12 1 * *';
export async function startChannelSpotightCronjob(app, store) {
  const channelSpotightJob = new cron.CronJob(FIRST_DAY_OF_EVERY_MONTH, async function() {
    try {
      logger.info('💡 Deciding which channel to spotight...');
      const channelToSpotight = await decideWhichChannelToSpotight(app, store);
      if(channelToSpotight === null) {
        return;
      }
    } catch(err) {
      logger.error(`decideWhichChannelToSpotlight: ${err.stack}`);
      logger.info('❌ Did not spotlight a channel.')
      return;
    }

    logger.info(`🔦 Putting the spotlight on #${channelToSpotight.name}`);
    try{
      await announceChannelSpotlight(app, channelToSpotight);
    } catch(err) {
      logger.error(`announceChannelSpotlight: ${err.stack}`);
      logger.info('❌ Did not spotlight a channel.');
      return;
    }

    try{
      await markChannelAsSpotighted(store, channelToSpotight);
    } catch(err) {
      logger.error(`markChannelAsSpotighted: ${err.stack}`);
      return;
    }
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
  publicChannels = publicChannels.filter(channel => !disqualifiedChannels.some(prefix => channel.name.startsWith(prefix)));

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
  const blocks = [
    { type: 'section', text: { text: `:flashlight: Today's channel spotlight goes to *<#${channel.id}>*!`, type: 'mrkdwn' } },
  ];

  if(channel.purpose.value) {
    blocks.push({ type: 'section', text: { text: `*Purpose:* ${channel.purpose.value}`, type: 'mrkdwn' } });
  }

  if(channel.topic.value) {
    blocks.push({ type: 'section', text: { text: `*Topic:* ${channel.topic.value || "(not set, but I'm sure it's interesting!)"}`, type: 'mrkdwn' } });
  }

  blocks.push({ type: 'context', elements: [{ text: `If that sounds interesting, why not hop in and chat?`, type: 'plain_text', emoji: true }] });

  return blocks;
}

async function markChannelAsSpotighted(store, channel) {
  const spotightedChannels = (await store.get('spotightedChannels')) || {};
  spotightedChannels[channel.name] = moment().format('YYYY-MM-DD');
  return store.set('spotightedChannels', spotightedChannels);
}
