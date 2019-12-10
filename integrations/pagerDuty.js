const { ux, sdk } = require('@cto.ai/sdk')
const moment = require('moment')
const pagerDuty = require('../utils/api/pagerDuty')
const {
  incidentStartPrompts,
  whereToCreatePrompt,
  pagerDutyAssigneePrompt,
  escalationPolicyPrompt,
  servicePrompt,
  updateSelectPrompt,
  howUpdatePrompt,
  noteContentsPrompt,
  snoozeDurationPrompt,
  searchIncidentsPrompt,
  escalatePrompt,
} = require('../prompts')
const { getUrgency } = require('../utils/helpers')
const { createGitlabIssue } = require('../utils/api/gitlab')
const sendSlackMessage = require('../utils/api/slack')

/**
 * createIncident prompts the user for info and creates a PagerDuty incident.
 *
 * @param {object} authData The user's entered auth data
 * @param {object} user     The current SDK user
 */
async function createIncident(authData, user) {
  // Get incident info from the user
  let {
    description,
    impact,
    started_at,
    status,
    message,
  } = await ux.prompt(incidentStartPrompts)

  // Create our timestamps
  const ts = moment().unix()
  const updated_at = ts
  started_at = moment(started_at)
    .tz(moment.tz.guess())
    .format('h:MM A z on dddd, MMMM D, YYYY')

  // Create the incident summary
  const incidentSummary = {
    description,
    impact,
    started_at,
    status,
    timeline: [
      {
        status,
        message,
        ts: updated_at
      }
    ]
  }

  const {
    gitlabToken,
    projectId,
    slackWebHook,
    pagerDutyKey
  } = authData

  try {
    // Prompt for which integrations we should activate for this incident
    const { gitlab, slack, pagerDuty } = await ux.prompt(whereToCreatePrompt)

    if (gitlab) {
      await createGitlabIssue(gitlabToken, projectId, incidentSummary)
    }

    if (slack) {
      await sendSlackMessage(slackWebHook, incidentSummary, user)
    }

    if (pagerDuty) {
      // Init our PD client
      pagerDuty.initializePagerDuty(pagerDutyKey)

      // Prompt the user for which escalation policy they want to use
      let escalationPolicy
      const policies = await pagerDuty.getEscalationPolicies()
      if (policies.length) {
        // Create a name -> id object map for good natural language prompts
        // to the user
        const policyChoices = {}
        policies.map(policy => policyChoices[policy.name] = policy.id)
        // Get user to select an escalation policy
        const answer = await ux.prompt(escalationPolicyPrompt(Object.keys(policyChoices)))
        // Pull the policy id from its name
        escalationPolicy = policyChoices[answer.escalationPolicy]
      }

      // Prompt the user for which service to create the incident for
      const services = await pagerDuty.getServices()
      const serviceChoices = {}
      services.map(service => serviceChoices[service.name] = service.id)
      const { service } = await ux.prompt(servicePrompt(Object.keys(serviceChoices)))
      const serviceId = serviceChoices[service]

      ux.spinner.start("Creating PagerDuty incident")
      // Create the PagerDuty incident
      const incident = await pagerDuty.newIncident(user, {
        incident: {
          title: description,
          escalation_policy: {
            id: escalationPolicy,
            type: "escalation_policy_reference",
          },
          service: {
            id: serviceId,
            type: "service_reference",
          },
          body: {
            type: "incident_body",
            details: `${message}\n Started at: ${started_at}\n Impact: ${impact}\n Status: ${status}`,
          },
          urgency: getUrgency(impact),
        }
      })
      ux.spinner.start("Done!")
      sdk.log(ux.colors.blue(`You can see you incident at ${incident.html_url}`))
    }
  } catch (err) {
    console.error(err)
  }
}

/**
 * searchIncidents gathers a user query for incidents, executes it, and prints
 * the results.
 *
 * @param {object} authData The user's entered auth data
 * @param {object} user     The current SDK user
 */
async function searchIncidents(authData, user) {
  // Init our PD client
  const { pagerDutyKey } = authData
  pagerDuty.initializePagerDuty(pagerDutyKey)

  // Get query information from the user
  const query = await ux.prompt(searchIncidentsPrompt)

  sdk.log('')
  ux.spinner.start('Retrieving incidents')
  const incidents = await pagerDuty.getIncidents(query)
  ux.spinner.stop('Done!\n')

  // Nothing found; return early
  if (!incidents.length) {
    sdk.log(ux.colors.blue("No incidents found!"))
    return incidents
  }

  sdk.log(ux.colors.magenta('\nWe found the following incidents:\n'))
  incidents.map(printIncident)
}

/**
 * printIncident pretty prints an incident.
 */
function printIncident(incident) {
  sdk.log(`\t${incident.title}`)
  sdk.log(`\t\tStatus: ${incident.status}`)
  sdk.log(`\t\tService: ${incident.service.summary}`)
  sdk.log(`\t\tEscalation Policy: ${incident.escalation_policy.summary}`)
  sdk.log(`\t\tUrgency: ${incident.urgency}`)
  sdk.log(`\t\tCreated at: ${incident.created_at}`)
  sdk.log(`\t\tLast modified: ${incident.last_status_change_at}`)
  if (incident.assignments.length) {
    sdk.log(`\t\tPeople assigned:`)
    incident.assignments.map(assignee => {
      sdk.log(`\t\t\t${asignee.summary}`)
    })
  }
  sdk.log(`\t\tLink: ${incident.html_url}`)
}

/**
 * whoOnCall retrieves users on call with PagerDuty and prints them out
 *
 * @param {object} authData The user's entered auth data
 * @param {object} user     The current SDK user
 */
async function whoOnCall(authData, user) {
  // Init our PD client
  const { pagerDutyKey } = authData
  pagerDuty.initializePagerDuty(pagerDutyKey)

  // Pretty print the on call users for each policy
  const onCalls = await pagerDuty.getOnCall()
  Object.keys(onCalls).map(policy => {
    sdk.log(ux.colors.magenta(`The following people are on call for the '${policy}' policy:\n\n`))
    onCalls[policy].map(person => {
      sdk.log(`\t${person.name}:`)
      sdk.log(`\t\tID: ${person.id}`)
      sdk.log(`\t\tEscalation Level: ${person.escalation_level}\n\n`)
    })
  })
}

async function updateIncident(authData, user) {
  // Init our PD client
  const { pagerDutyKey } = authData
  pagerDuty.initializePagerDuty(pagerDutyKey)

  // Only retrieve active incidents
  const query = {
    statuses: ['triggered', 'acknowledged'],
  }

  sdk.log('')
  ux.spinner.start('Retrieving incident list')
  const incidents = await pagerDuty.getIncidents(query)
  ux.spinner.stop('Done!')
  sdk.log('')

  // Map incident titles to their ids
  const choicesMap = {}
  incidents.map(incident => {
    choicesMap[incident.title] = incident.id
  })
  const choices = Object.keys(choicesMap)

  // Get user to select an incident/update type and setup config values
  const { selected } = await ux.prompt(updateSelectPrompt(choices))
  const incidentId = choicesMap[selected]
  const { updateType } = await ux.prompt(howUpdatePrompt)
  const { me: { email } } = user

  switch (updateType) {
    case 'Resolve this incident':
      resolveIncident(incidentId, email)
      break;
    case 'Escalate this incident':
      escalateIncident(incidentId, email)
      break;
    case 'Add a note':
      addNote(incidentId, email)
      break;
    case 'Snooze this incident':
      snoozeIncident(incidentId, email)
      break;
    default:
      sdk.log(ux.colors.red('Invalid option selected!'))
  }

}

/**
 * resolveIncident resolves an incident with the current user as the resolver.
 *
 * @param {string} incidentId The id of the incident to resolve
 * @param {string} email      The current user's email
 */
async function resolveIncident(incidentId, email) {
  const resolvePayload = {
    "incident": {
      "type": "incident_reference",
      "status": "resolved"
    }
  }

  ux.spinner.start(`Resolving incident ${incidentId}`)
  await pagerDuty.updateIncident(incidentId, email, resolvePayload)
  ux.spinner.stop('Done!')
}

/**
 * escalateIncident causes the current user to escalate an incident to the chosen level.
 *
 * @param {string} incidentId The id of the incident to resolve
 * @param {string} email      The current user's email
 */
async function escalateIncident(incidentId, email) {
  const { level } = await ux.prompt(escalatePrompt)
  const escalatePayload = {
    "incident": {
      "type": "incident_reference",
      "escalation_level": level,
    }
  }

  ux.spinner.start(`Escalating incident ${incidentId} to level ${level}`)
  await pagerDuty.updateIncident(incidentId, email, escalatePayload)
  ux.spinner.stop('Done!')
}

/**
 * addNote adds a note to the selected incident, authored by the current user
 *
 * @param {string} incidentId The id of the incident to resolve
 * @param {string} email      The current user's email
 */
async function addNote(incidentId, email) {
  const { content } = await ux.prompt(noteContentsPrompt)
  const notePayload = {
    "note": {
      content
    }
  }

  ux.spinner.start(`Adding note to incident ${incidentId}`)
  await pagerDuty.addNote(incidentId, email, notePayload)
  ux.spinner.stop('Done!')
}

/**
 * snoozeIncident snoozes the selected incident until the user selected time
 *
 * @param {string} incidentId The id of the incident to resolve
 * @param {string} email      The current user's email
 */
async function snoozeIncident(incidentId, email) {
  const { snoozeDuration } = await ux.prompt(snoozeDurationPrompt)
  const duration = Math.abs((new Date(snoozeDuration).getTime() - new Date().getTime()) / 1000)

  ux.spinner.start(`Snoozing incident ${incidentId}`)
  await pagerDuty.snoozeIncident(incidentId, email, { duration })
  ux.spinner.stop('Done!')
}

module.exports = {
  createIncident,
  searchIncidents,
  whoOnCall,
  updateIncident,
}
