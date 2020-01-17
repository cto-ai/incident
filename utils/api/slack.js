const { ux } = require('@cto.ai/sdk')
const { IncomingWebhook } = require('@slack/webhook')
const { handleError } = require('../handlers')
const colours = {
  Investigating: '#831313',
  Identified: '#f0adb4',
  Monitoring: '#623ddb',
  Resolved: '#44ee44',
}

/**
 * sendSlackMessage sends a message to the user's chosen slack workspace channel.
 *
 * @param {string} webHookURL  The webhook URL generated from the installed incident.sh Slack application
 * @param {object} opsIncident The incident summary to send in the message
 * @param {object} user     The current SDK user
 */
async function sendSlackMessage(webHookURL, opsIncident, user) {
  const webhook = new IncomingWebhook(webHookURL) // Init the Slack API

  // Create the message values
  const { description, impact, started_at, timeline } = opsIncident
  const status = timeline[timeline.length - 1].status
  const mainTitle = `*Incident Description:* ${description}`
  const priority = `*Priority:* ${impact}`
  const startImpact = `*Start of Impact:* ${started_at}`
  const statusIncident = `*Status:* ${status}`

  const { me } = user

  // Create the attachment to show a nicely formatted message
  const attachments = timeline.map(item => {
    let text = item.message
    if (item.url) {
      text = `${item.url} \n ${text}`
    }

    return {
      color: colours[item.status],
      author_name: `${me.firstName} ${me.lastName}`,
      author_icon: 'https://cto.ai/blog/favicon.png',
      title: item.status,

      text,
      footer: 'Incidents.sh',
      footer_icon:
        'https://cto.ai/blog/content/images/2019/01/ops-logo-stack-1-6220491ee2.png',
      ts: item.ts,
    }
  })

  // The message object to send
  const slackMessage = {
    text: `${mainTitle}\n ${priority}\n ${startImpact}\n${statusIncident}\n*Timeline:* `,
    color: '#2980cc',
    attachments: attachments,
  }
  try {
    await ux.spinner.start('🏃  Posting to Slack')
    await webhook.send(slackMessage)
  } catch (err) {
    await handleError(err, 'Failed to post to Slack')
  }
  await ux.spinner.stop('✅  Posted to slack!')
}

module.exports = sendSlackMessage
