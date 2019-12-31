const { ux } = require('@cto.ai/sdk')
const { secondary, reset } = ux.colors

const newRunPrompts = [
  {
    type: 'input',
    name: 'gitlabToken',
    message: `Please input your GitLab Access Token ${reset.green('→')}`,
  },
  {
    type: 'input',
    name: 'projectId',
    message: `Please input your GitLab Project Id ${reset.green('→')}`,
  },
  {
    type: 'input',
    name: 'slackWebHook',
    message: `Please input your Slack WebHook URL ${reset.green('→')}`,
  },
  {
    type: 'input',
    name: 'pagerDutyKey',
    message: `Please input your PagerDuty API Key ${reset.green('→')}`,
  },
]

const useOldAuthPrompt = [
  {
    type: 'confirm',
    name: 'useOld',
    message: `Would you like to use your previously entered GitLab, Slack, and PagerDuty configuration? ${reset.green(
      '→'
    )}`,
  },
]

const whichJobPrompt = choices => {
  return [
    {
      type: 'list',
      name: 'job',
      message: `What would you like to do? ${reset.green('→')}`,
      choices,
    },
  ]
}

const incidentStartPrompts = [
  {
    type: 'input',
    name: 'description',
    message: `\n⚠️  Please describe the incident: ${secondary(
      '(Maximum 255 characters)'
    )}`,
    validate: input => {
      if (input.length < 255) {
        return true
      }
      return 'There is a 255 character limit!'
    },
  },
  {
    type: 'list',
    name: 'impact',
    message: 'What impact is the incident having?',
    choices: [
      '🔥   All customers are affected.',
      '😭   Large segment of customers are affected.',
      '😫   Small segment of customers are affected.',
      '😣   Site performance degraded for some customers.',
      '☹️    Potential issue, but customers are currently unaware.',
    ],
  },
  {
    type: 'datepicker',
    name: 'started_at',
    message: 'When did the incident start?',
    format: ['mm', '/', 'dd', '/', 'yy', ' ', 'hh', ':', 'MM', ' ', 'TT'],
  },
  {
    type: 'list',
    name: 'status',
    message: 'What is the current status to of the incident?',
    choices: [
      '🔍 Investigating',
      '🚨 Identified',
      '📈 Monitoring',
      '👍 Resolved',
    ],
  },
  {
    type: 'input',
    name: 'message',
    message: 'What is the current incident update?',
  },
]

const whereToCreatePrompt = [
  {
    type: 'confirm',
    name: 'gitlab',
    message: `Would you like to create a GitLab issue? ${reset.green('→')}`,
  },
  {
    type: 'confirm',
    name: 'slack',
    message: `Would you like to send a Slack message to your linked channel? ${reset.green(
      '→'
    )}`,
  },
  {
    type: 'confirm',
    name: 'pagerDuty',
    message: `Would you like to create a PagerDuty incident? ${reset.green(
      '→'
    )}`,
  },
]

const pagerDutyAssigneePrompt = choices => {
  return [
    {
      type: 'list',
      name: 'assignee',
      message: `Which of PagerDuty user would you like to assign to this incident? ${reset.green(
        '→'
      )}`,
      choices,
    },
  ]
}

const escalationPolicyPrompt = choices => {
  return [
    {
      type: 'list',
      name: 'escalationPolicy',
      message: `Which PagerDuty escalation policy would you like to use for this incident? ${reset.green(
        '→'
      )}`,
      choices,
    },
  ]
}

const servicePrompt = choices => {
  return [
    {
      type: 'list',
      name: 'service',
      message: `Which PagerDuty service would you like to use for this incident? ${reset.green(
        '→'
      )}`,
      choices,
    },
  ]
}

const updateSelectPrompt = choices => {
  return [
    {
      type: 'list',
      name: 'selected',
      message: `Which incident would you like to update? ${reset.green('→')}`,
      choices,
    },
  ]
}

const howUpdatePrompt = [
  {
    type: 'list',
    name: 'updateType',
    message: `How would you like to update this incident? ${reset.green('→')}`,
    choices: [
      'Resolve this incident',
      'Escalate this incident',
      'Add a note',
      'Snooze this incident',
    ],
  },
]

const noteContentsPrompt = [
  {
    type: 'input',
    name: 'content',
    message: `Please enter your note ${reset.green('→')}`,
  },
]

const snoozeDurationPrompt = [
  {
    type: 'datepicker',
    name: 'snoozeDuration',
    message: `Until when would you like to snooze this incident? ${reset.green(
      '→'
    )}`,
    format: ['mm', '/', 'dd', '/', 'yy', ' ', 'hh', ':', 'MM', ' ', 'TT'],
  },
]

const continuePrompts = [
  {
    type: 'input',
    name: 'continue',
    message: `\nPress enter to continue →`,
    afterMessage: ' ',
    transformer: input => ' ',
  },
]

const searchIncidentsPrompt = [
  {
    type: 'datepicker',
    name: 'since',
    message: `What is the start of the date range over which you want to search? ${reset.green(
      '→'
    )}`,
    format: ['mm', '/', 'dd', '/', 'yy', ' ', 'hh', ':', 'MM', ' ', 'TT'],
  },
  {
    type: 'datepicker',
    name: 'until',
    message: `What is the end of the date range over which you want to search? ${reset.green(
      '→'
    )}`,
    format: ['mm', '/', 'dd', '/', 'yy', ' ', 'hh', ':', 'MM', ' ', 'TT'],
  },
  {
    type: 'checkbox',
    name: 'statuses',
    message: `Which statuses would you like to search for? ${reset.green('→')}`,
    choices: ['triggered', 'acknowledged', 'resolved'],
  },
  {
    type: 'checkbox',
    name: 'urgencies',
    message: `Which urgencies would you like to search for? ${reset.green(
      '→'
    )}`,
    choices: ['high', 'low'],
  },
]

const shouldContinuePrompt = [
  {
    type: 'confirm',
    name: 'shouldContinue',
    message: `\nWould you like to perform another task ${reset.green('→')}`,
  },
]

const escalatePrompt = [
  {
    type: 'input',
    name: 'level',
    message: `Please enter the escalation level to promote this incident to ${reset.green(
      '→'
    )}`,
    validate: function(input) {
      const regex = /\d+/g
      const match = regex.exec(input)
      if (match) {
        return true
      }
      return 'Please enter an integer'
    },
  },
]

module.exports = {
  newRunPrompts,
  useOldAuthPrompt,
  whichJobPrompt,
  incidentStartPrompts,
  whereToCreatePrompt,
  pagerDutyAssigneePrompt,
  escalationPolicyPrompt,
  servicePrompt,
  updateSelectPrompt,
  howUpdatePrompt,
  noteContentsPrompt,
  snoozeDurationPrompt,
  continuePrompts,
  searchIncidentsPrompt,
  shouldContinuePrompt,
  escalatePrompt,
}
