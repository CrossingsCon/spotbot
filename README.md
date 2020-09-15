# SpotBot

A friendly and helpful bot for the Crossings Slack!

## Features

- Wishes users happy birthday on their birthday
- Spotlights a new channel every Friday

## Setup

1. Enable the following Bot Token OAuth scopes for Spotbot:
  - `channels:read` (to look for channels to feature in the channel spotlight)
  - `chat:write` (to send messages)
  - `users:read` (to find out users' timezones for timezone-appropriate birthday wishes)
  - `users.profile:read` (to look for birthdays in users' profiles)

2. Assign environment variables in *.env*:
  - your **Bot User OAuth Access Token** goes in `SLACK_BOT_TOKEN`
  - your **Signing Secret** goes in `SLACK_SIGNING_SECRET`
  - the **port you want Spotbot to run on** (default: 3000) goes in `PORT`

3. If you're running it locally, do the usual Node thing:
```
$ npm install
$ node run start
```

4. If you're setting it up on a server, register it with systemd:
Instructions TBD. [Reference this for now.](https://nodesource.com/blog/running-your-node-js-app-with-systemd-part-1/)
