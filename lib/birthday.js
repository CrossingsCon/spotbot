import moment from 'moment-timezone';

const BIRTHDAY_HOUR = 8; // wish people a happy birthday at this hour, their time

async function getBirthdaysForThisHour(app) {
  const now = moment();
  let users = [];

  // go get ALL the users! (even if it's paginated!)
  let nextCursor = "";
  do {
    const userBatch = await app.client.users.list({
      token: process.env.SLACK_BOT_TOKEN,
      cursor: nextCursor,
    });

    users = [...users, ...userBatch.members];
    nextCursor = userBatch.response_metadata.next_cursor;
  } while(nextCursor != "");

  // no bots and no deleted users, please
  users = users.filter(u => !u.deleted).filter(u => !u.is_bot);

  // okay, now we need to find out the users for which the current local time is in the birthday hour right now
  users = users.filter(u => {
    const localMoment = now.tz(u.tz);
    return BIRTHDAY_HOUR <= localMoment.hour() && localMoment.hour() < (BIRTHDAY_HOUR + 1);
  });

  // get those users' birthdays and see whether today is their birthday!
  let birthdayUsersThisHour = await Promise.all(
    users.map(async u => ({ id: u.id, tz: u.tz, birthday: await getBirthdayForUser(app, u.id) }))
  );

  birthdayUsersThisHour = birthdayUsersThisHour
    .filter(u => u.birthday) // filter out null birthdays
    .filter(u => moment(u.birthday, 'YYYY-MM-DD', u.tz).isSame(now.tz(u.tz), "day")); // filter for birthdays that are today

  return birthdayUsersThisHour;
}

const BIRTHDAY_PROFILE_FIELD_ID = 'Xf01A50JAP5M';
async function getBirthdayForUser(app, userId) {
  let userProfile;
  try {
    userProfile = await app.client.users.profile.get({
      token: process.env.SLACK_BOT_TOKEN,
      user: userId,
    });
  } catch (err) {
    // if this fails for some reason, just log it and pass it through
    console.warn(`Failed looking up profile for ${userId}. Error was: ${err.data.error}. Continuing...`);
    return null;
  }

  const fields = userProfile.profile.fields || {}; // userProfile.profile.fields can be null if a user hasn't filled any out
  const birthday = (fields[BIRTHDAY_PROFILE_FIELD_ID] || {}).value || null; // the birthday field can also be null - but if it's not, we want the value prop inside it
  return birthday;
}

export {
  getBirthdaysForThisHour,
};
