# SpotBot

A friendly and helpful bot for the Crossings Slack

## Features

- Wishes users happy birthday on their birthday
- Highlights a new channel every week

## Setup

1. Enable the following Bot Token OAuth scopes for Spotbot:
  - `chat:write` (to send messages)
  - `users:read` (to look for birthdays in users' profiles)

2. Assign environment variables in *.env*:
  - your **Bot User OAuth Access Token** goes in `SLACK_BOT_TOKEN`
  - your **Signing Secret** goes in `SLACK_SIGNING_SECRET`
  - (temporary) the **ID for the user you want the bot to say hi to on startup** goes in `STARTUP_PING_TARGET_UID`
