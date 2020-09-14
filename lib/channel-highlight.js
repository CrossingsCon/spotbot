import cron from 'cron';
import moment from 'moment-timezone';

import { pageThrough } from './page-through.js';
import { randomInt } from './random.js';

const HIGHLIGHT_BLOCKLIST = [];
const HIGHLIST_ADDLIST = []; // TODO: implement this

const EVERY_DAY_AT_NOON = '0 0 12 * * *';
export async function startChannelHighlightCronjob(app, store) {
  const channelHighlightJob = new cron.CronJob(EVERY_DAY_AT_NOON, async function() {
    console.info('🔦 Deciding which channel to highlight...');
    const channelToHighlight = await decideWhichChannelToHighlight(app, store);
    await postChannelHighlightInGeneral(app, channelToHighlight);
    await markChannelAsHighlighted(store, channelToHighlight);
  }, null, true);

  console.log('🏅 Channel highlight cronjob scheduled!');
}

async function decideWhichChannelToHighlight(app, store) {
  const highlightedChannels = (await store.get('highlightedChannels')) || {};
  // disqualify channels highlighted in the last 30 days
  const THIRTY_DAYS_AGO = moment().subtract(30, 'days');
  const recentlyHighlighted = Object.keys(highlightedChannels)
    .filter(channelName => THIRTY_DAYS_AGO.isSameOrAfter(highlightedChannels[channelName], 'day'));

  let publicChannels = await pageThrough(async function(nextCursor) {
    return app.client.conversations.list({
      token: process.env.SLACK_BOT_TOKEN,
      type: 'public_channel',
      exclude_archived: true,
      cursor: nextCursor,
    });
  }, 'channels');

  const disqualifiedChannels = [...HIGHLIGHT_BLOCKLIST, ...recentlyHighlighted];
  publicChannels = publicChannels.filter(channel => !disqualifiedChannels.includes(channel.name));

  // ...and the lucky winner is...
  if(publicChannels.length === 0) {
    console.warn(`No public channels left to highlight after filtering!`);
    return null;
  }
  return publicChannels[randomInt(0, publicChannels.length)];
}

async function postChannelHighlightInGeneral(app, channel) {
  const message = `Today's channel spotlight goes to <#${channel.id}>! The current topic of <#${channel.id}> is: ${channel.topic.value || '...a mystery!'} If that sounds interesting to you, why not join the conversation?`;
  return pingEli(app, message);
}

async function markChannelAsHighlighted(store, channel) {
  const highlightedChannels = (await store.get('highlightedChannels')) || {};
  highlightedChannels[channel.name] = moment().format('YYYY-MM-DD');
  return store.set('highlightedChannels', highlightedChannels);
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
