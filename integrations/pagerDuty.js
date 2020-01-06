const { ux } = require('@cto.ai/sdk')
const moment = require('moment')
const pd = require('../utils/api/pagerDuty')
const {
  incidentTitlePrompt,
  incidentStartPrompts,
  whereToCreatePrompt,
  pagerDutyAssigneePrompt,
  escalationPolicyPrompt,
  servicePrompt,
  updateSelectPrompt,
  howUpdatePrompt,
  noteContentsPrompt,
  snoozeDurationPrompt,
  getSearchQuery,
  escalatePrompt,
} = require('../prompts')
const { getUrgency } = require('../utils/helpers')
const { createGitlabIssue } = require('../utils/api/gitlab')
const sendSlackMessage = require('../utils/api/slack')
const { blue, callOutCyan, magenta, red } = ux.colors

/**
 * createIncident prompts the user for info and creates a PagerDuty incident.
 *
 * @param {object} authData The user's entered auth data
 * @param {object} user     The current SDK user
 */
async function createIncident(authData, user) {
  // Get incident info from the user
  let incidentTitle = await ux.prompt(incidentTitlePrompt)
  while (incidentTitle.description.length > 255) {
    await ux.print('Incident title must be less than 255 characters!')
    incidentTitle = await ux.prompt(incidentTitlePrompt)
  }
  let { impact, started_at, status, message } = await ux.prompt(
    incidentStartPrompts
  )
  let { description } = incidentTitle

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
        ts: updated_at,
      },
    ],
  }

  const { gitlabToken, projectId, slackWebHook, pagerDutyKey } = authData

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
      pd.initializePagerDuty(pagerDutyKey)

      // Prompt the user for which escalation policy they want to use
      let escalationPolicy
      const policies = await pd.getEscalationPolicies()
      if (policies.length) {
        // Create a name -> id object map for good natural language prompts
        // to the user
        const policyChoices = {}
        policies.map(policy => (policyChoices[policy.name] = policy.id))
        // Get user to select an escalation policy
        const answer = await ux.prompt(
          escalationPolicyPrompt(Object.keys(policyChoices))
        )
        // Pull the policy id from its name
        escalationPolicy = policyChoices[answer.escalationPolicy]
      }

      // Prompt the user for which service to create the incident for
      const services = await pd.getServices()
      const serviceChoices = {}
      services.map(service => (serviceChoices[service.name] = service.id))
      const { service } = await ux.prompt(
        servicePrompt(Object.keys(serviceChoices))
      )
      const serviceId = serviceChoices[service]

      await ux.spinner.start('🏃‍ Creating a new PagerDuty incident')
      // Create the PagerDuty incident
      const incident = await pd.newIncident(user, {
        incident: {
          title: description,
          escalation_policy: {
            id: escalationPolicy,
            type: 'escalation_policy_reference',
          },
          service: {
            id: serviceId,
            type: 'service_reference',
          },
          body: {
            type: 'incident_body',
            details: `${message}\n Started at: ${started_at}\n Impact: ${impact}\n Status: ${status}`,
          },
          urgency: getUrgency(impact),
        },
      })
      await ux.spinner.stop('🎉 PagerDuty incident created! 🎉')
      await ux.print(blue(`You can see the incident at ${incident.html_url}`))
    }
  } catch (err) {
    await handleError(err, 'Failed to create an incident')
  }
}

/**
 * searchIncidents gathers a user query for incidents, executes it, and prints
 * the results.
 *
 * @param {object} authData The user's entered auth data
 * @param {object} user     The current SDK user
 */
async function searchIncidents(authData) {
  // Init our PD client
  const { pagerDutyKey } = authData
  pd.initializePagerDuty(pagerDutyKey)

  // Get query information from the user
  const query = await getSearchQuery()
  // Prompt returns values in title case for UX readability. API only accepts lowercase values.
  query.statuses = query.statuses.map(status => status.toLowerCase())
  query.urgencies = query.urgencies.map(urgency => urgency.toLowerCase())
  await ux.spinner.start('🏃‍  Retrieving incidents')
  const incidents = await pd.getIncidents(query)

  // Nothing found; return early
  if (!incidents.length) {
    await ux.spinner.stop(magenta('🤷‍  No incidents found!'))
    return incidents
  }

  await ux.spinner.stop('✅  Retrieved incidents!')
  const titleStr = magenta('\nHere are the retrieved incidents:')
  const incidentsStr = incidents.map(printIncident)
  await ux.print(`${titleStr}\n${incidentsStr.join('')}`)
}

/**
 * printIncident pretty prints an incident.
 */
function printIncident(incident) {
  let incidentStr = `\n\t${incident.title}
  \t\tStatus: ${incident.status}
  \t\tService: ${incident.service.summary}
  \t\tEscalation Policy: ${incident.escalation_policy.summary}
  \t\tUrgency: ${incident.urgency}
  \t\tCreated at: ${incident.created_at}
  \t\tLast modified: ${incident.last_status_change_at}`
  if (incident.assignments.length) {
    incidentStr += `\n\t\tPeople assigned:`
    incident.assignments.map(async assignee => {
      incidentStr += `\n\t\t\t${assignee.summary}`
    })
  }
  incidentStr += `\n\t\tLink: ${incident.html_url}\n`
  return incidentStr
}

/**
 * whoOnCall retrieves users on call with PagerDuty and prints them out
 *
 * @param {object} authData The user's entered auth data
 */
async function whoOnCall(authData) {
  // Init our PD client
  const { pagerDutyKey } = authData
  pd.initializePagerDuty(pagerDutyKey)

  // Pretty print the on call users for each policy
  // Concatenated strings before printing for ux.print
  const onCalls = await pd.getOnCall()
  Object.keys(onCalls).forEach(async policy => {
    const policyTitle = magenta(
      `\nThe following people are on call for the '${policy}' policy:\n`
    )
    const policyDetails = onCalls[policy].map(person => {
      let personStr = `\n\t${person.name} - Escalation Level: ${person.escalation_level}`
      if (person.end) {
        const endingTime = new Date(person.end)
        const formattedTimeStamp = endingTime.toUTCString()
        personStr += `\n\t${callOutCyan(
          `Rotational on-call ending on: ${formattedTimeStamp}`
        )}`
      }
      return personStr
    })
    await ux.print(`${policyTitle}${policyDetails.join('')}`)
  })
}

async function updateIncident(authData, user) {
  // Init our PD client
  const { pagerDutyKey } = authData
  pd.initializePagerDuty(pagerDutyKey)

  // Only retrieve active incidents
  const query = {
    statuses: ['triggered', 'acknowledged'],
  }

  await ux.spinner.start('🏃 Retrieving incident list')
  const incidents = await pd.getIncidents(query)

  // Map incident titles to their ids
  const choicesMap = {}
  incidents.map(incident => {
    choicesMap[incident.title] = incident.id
  })
  const choices = Object.keys(choicesMap)
  if (!choices.length) {
    await ux.spinner.stop(
      '🤷‍  There are no incidents available to be updated!'
    )
    return
  }
  await ux.spinner.stop('✅  Retrieved incident list!')

  // Get user to select an incident/update type and setup config values
  const { selected } = await ux.prompt(updateSelectPrompt(choices))
  const incidentId = choicesMap[selected]
  const { updateType } = await ux.prompt(howUpdatePrompt)
  const {
    me: { email },
  } = user

  switch (updateType) {
    case 'Resolve this incident':
      await resolveIncident(incidentId, email)
      break
    case 'Escalate this incident':
      await escalateIncident(incidentId, email)
      break
    case 'Add a note':
      await addNote(incidentId, email)
      break
    case 'Snooze this incident':
      await snoozeIncident(incidentId, email)
      break
    default:
      await ux.print(red('Invalid option selected!'))
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
    incident: {
      type: 'incident_reference',
      status: 'resolved',
    },
  }

  await ux.spinner.start(`♻️  Resolving incident ${incidentId}`)
  await pd.updateIncident(incidentId, email, resolvePayload)
  await ux.spinner.stop(`✅  Indicent ${incidentId} has been resolved!`)
}

/**
 * escalateIncident causes the current user to escalate an incident to the chosen level.
 *
 * @param {string} incidentId The id of the incident to resolve
 * @param {string} email      The current user's email
 */
async function escalateIncident(incidentId, email) {
  const chosenLevel = await ux.prompt(escalatePrompt)
  const escalatePayload = {
    incident: {
      type: 'incident_reference',
      escalation_level: chosenLevel.level,
    },
  }

  await ux.spinner.start(
    `⬆️  Escalating incident ${incidentId} to level ${chosenLevel.level}`
  )
  await pd.updateIncident(incidentId, email, escalatePayload)
  await ux.spinner.stop(
    `✅  Incident ${incidentId} has been escalated to level ${chosenLevel.level}`
  )
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
    note: {
      content,
    },
  }

  await ux.spinner.start(`🏃  Adding note to incident ${incidentId}`)
  await pd.addNote(incidentId, email, notePayload)
  await ux.spinner.stop(`✅  Note has been added to incident ${incidentId}!`)
}

/**
 * snoozeIncident snoozes the selected incident until the user selected time
 *
 * @param {string} incidentId The id of the incident to resolve
 * @param {string} email      The current user's email
 */
async function snoozeIncident(incidentId, email) {
  const { snoozeDuration } = await ux.prompt(snoozeDurationPrompt)
  const duration = Math.abs(
    (new Date(snoozeDuration).getTime() - new Date().getTime()) / 1000
  )

  ux.spinner.start(`😴  Snoozing incident ${incidentId}`)
  await pd.snoozeIncident(incidentId, email, { duration })
  ux.spinner.stop('✅  Incident has been snoozed!')
}

module.exports = {
  createIncident,
  searchIncidents,
  whoOnCall,
  updateIncident,
}
