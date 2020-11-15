// Because we don't handle any events from Slack, we shouldn't keep a port open.
// The port is opened by Bolt's default receiver. Therefore, we will implement a
// custom one to override it. See: https://slack.dev/bolt-js/concepts#receiver

class NullReceiver {
  init() {}

  async start() {}

  async stop() {}
}

export default NullReceiver;
