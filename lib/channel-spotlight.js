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
export async function startChannelSpotlightCronjob(app, store) {
  const channelSpotlightJob = new cron.CronJob(FIRST_DAY_OF_EVERY_MONTH, async function() {
    let channelToSpotlight = null;
    try {
      logger.info('💡 Deciding which channel to spotlight...');
      channelToSpotlight = await decideWhichChannelToSpotlight(app, store);
      if(channelToSpotlight === null) {
        return;
      }
    } catch(err) {
      logger.error(`decideWhichChannelToSpotlight: ${err.stack}`);
      logger.info('❌ Did not spotlight a channel.')
      return;
    }

    logger.info(`🔦 Putting the spotlight on #${channelToSpotlight.name}`);
    try{
      await announceChannelSpotlight(app, channelToSpotlight);
    } catch(err) {
      logger.error(`announceChannelSpotlight: ${err.stack}`);
      logger.info('❌ Did not spotlight a channel.');
      return;
    }

    try{
      await markChannelAsSpotlighted(store, channelToSpotlight);
    } catch(err) {
      logger.error(`markChannelAsSpotlighted: ${err.stack}`);
      return;
    }
  }, null, true);

  logger.info('🏅 Channel spotlight cronjob scheduled!');
}

async function decideWhichChannelToSpotlight(app, store) {
  logger.debug(`decideWhichChannelToSpotlight: Pulling the list of spotlighted channels out of the store...`);
  const spotlightedChannels = (await store.get('spotlightedChannels')) || {};
  logger.debug(`decideWhichChannelToSpotlight: ${spotlightedChannels.length} channels found`);

  // disqualify channels spotlighted in the last 6 months
  // const THIRTY_DAYS_AGO = moment().subtract(30, 'days');
  const SIX_MONTHS_AGO = moment().subtract(6, 'months');
  const recentlySpotlighted = Object.keys(spotlightedChannels)
    .filter(channelName => SIX_MONTHS_AGO.isSameOrAfter(spotlightedChannels[channelName], 'day'));
  logger.debug(`decideWhichChannelToSpotlight: ${recentlySpotlighted.length} recent channels found`);

  logger.debug(`decideWhichChannelToSpotlight: Getting all the public channels...`);
  let publicChannels = await pageThrough(async function(nextCursor) {
    return app.client.conversations.list({
      token: process.env.SLACK_BOT_TOKEN,
      type: 'public_channel',
      exclude_archived: true,
      cursor: nextCursor,
    });
  }, 'channels');
  logger.debug(`decideWhichChannelToSpotlight: Found ${publicChannels.length} public channels`);

  const disqualifiedChannels = [...SPOTLIGHT_BLOCKLIST, ...recentlySpotlighted];
  publicChannels = publicChannels.filter(channel => !disqualifiedChannels.some(prefix => channel.name.startsWith(prefix)));
  logger.debug(`decideWhichChannelToSpotlight: Found ${publicChannels.length} public channels left after filtering out blocked and recent channels`);

  // ...and the lucky winner is...
  if(publicChannels.length === 0) {
    logger.warn(`No public channels left to spotlight after filtering!`);
    return null;
  }

  logger.debug(`decideWhichChannelToSpotlight: Picking a random channel to return`);
  return publicChannels[randomInt(0, publicChannels.length)];
}

async function announceChannelSpotlight(app, channel) {
  logger.debug(`announceChannelSpotlight: Announcing channel spotlight for #${channel.name}`);
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

async function markChannelAsSpotlighted(store, channel) {
  logger.debug(`markChannelAsSpotlighted: Marking #${channel.name} as spotlighted...`);
  const spotlightedChannels = (await store.get('spotlightedChannels')) || {};
  spotlightedChannels[channel.name] = moment().format('YYYY-MM-DD');
  await store.set('spotlightedChannels', spotlightedChannels);
  logger.debug(`markChannelAsSpotlighted: Marked #${channel.name} as spotlighted`);
}
