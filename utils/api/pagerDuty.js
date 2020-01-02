const { sdk, ux } = require('@cto.ai/sdk')
const pagerDuty = require('node-pagerduty')

// PagerDuty config variables
let pd // Main API instance
const qs = {
  // Default query string
  time_zone: 'UTC',
}

/**
 * initializePagerDuty creates a new PagerDuty API client instance
 *
 * @param {string} token The PagerDuty API key
 */
function initializePagerDuty(token) {
  pd = new pagerDuty(token)
}

/**
 * getUsers retrieves all users linked to the PagerDuty account.
 *
 * @return {array} A list of all the users
 */
async function getUsers() {
  const { body } = await pd.users.listUsers(qs)
  const { users } = JSON.parse(body)
  return users
}

/**
 * matchUser attempts to match a PagerDuty user to the user running the op.
 *
 * @param {array} opUserEmail The list of email address for the user running the op
 * @param {array} userList Optional. A list of users to reduce
 *
 * @return {array} The matched PagerDuty users or an empty array
 */
async function matchUser(opUserEmail, userList) {
  const users = userList ? userList : await getUsers()
  return users.reduce((acc, user) => {
    if (user.email === opUserEmail) {
      return [...acc, user]
    }
    return acc
  }, [])
}

/**
 * getEscalationPolicies retrives all the escalation policies in the linked
 * PagerDuty account.
 *
 * @return {array} The list of escalation policies
 */
async function getEscalationPolicies() {
  const { body } = await pd.escalationPolicies.listEscalationPolicies(qs)
  return JSON.parse(body).escalation_policies
}

/**
 * getEscalationPolicy retrieves a single escalation policy.
 *
 * @param {string} id The escalation policy id
 *
 * @return {object} The found escalation policy
 */
async function getEscalationPolicy(id) {
  const { body } = await pd.escalationPolicies.getEscalationPolicy(id, qs)
  return JSON.parse(body).escalation_policy
}

/**
 * getServices retrives all the services in the linked PagerDuty account.
 *
 * @return {array} The list of services
 */
async function getServices() {
  const { body } = await pd.services.listServices(qs)
  return JSON.parse(body).services
}

/**
 * newIncident adds a new PagerDuty incident to the linked account
 *
 * @param {object} user     The current SDK user
 * @param {object} payload The data to create the incident with
 * @param {array} userList Optional. A list of users to match on
 *
 * @return {object} The created incident
 */
async function newIncident(user, payload, userList) {
  const { me } = user
  const opUserEmail = me.email
  const from = await matchUser(opUserEmail, userList)
  const {
    body: { incident },
  } = await pd.incidents.createIncident(from[0].email, payload)
  return incident
}

/**
 * getOnCall retrieves all PagerDuty users who are currently on call.
 *
 * @return {object} The users on call, sorted by policy and level
 */
async function getOnCall() {
  // Get on call users
  await ux.spinner.start('Retrieving users on call')
  const { body } = await pd.onCalls.listAllOnCalls(qs)
  const onCalls = JSON.parse(body).oncalls
  // Sort users into their policies
  const sorted = {}
  onCalls.map(policy => {
    // Organize the data from PagerDuty's response
    const policyName = policy.escalation_policy.summary
    const { escalation_level, end } = policy
    const { summary, id } = policy.user
    const user = {
      name: summary,
      escalation_level,
      id,
      end,
    }

    // Add the user to their escalation policy
    if (sorted[policyName]) {
      sorted[policyName] = [...sorted[policyName], user]
    } else {
      sorted[policyName] = [user]
    }
  })

  // Sort users, within the policies, by their escalation level
  Object.keys(sorted).map(k => {
    sorted[k] = sorted[k].sort((a, b) => {
      if (a.escalation_level > b.escalation_level) return 1
      if (b.escalation_level > a.escalation_level) return -1
      return 0
    })
  })
  await ux.spinner.stop('Done!')

  return sorted
}

/**
 * getIncidents retrieves all incidents matching the query.
 *
 * @param {object} q The query object to search on
 *
 * @return {array} The incidents found
 */
async function getIncidents(q) {
  const query = Object.assign({ ...qs }, q) // Override default query with passed values
  console.log(query)
  const { body } = await pd.incidents.listIncidents(query)
  return JSON.parse(body).incidents
}

/**
 * updateIncident updates a single incident.
 *
 * @param {string} id      The incident's id
 * @param {string} from    The email of a PagerDuty user
 * @param {object} payload The payload to update the incident with
 *
 * @return {object} The response body
 */
async function updateIncident(id, from, payload) {
  try {
    const { body } = await pd.incidents.updateIncident(id, from, payload)
    return body
  } catch (err) {
    if (`${err}`.includes('Incident Already Resolved')) {
      sdk.log(ux.colors.magenta('\nIncident already resolved!\n'))
      return {}
    }
    sdk.log(ux.colors.red(`${err}`))
  }
}

/**
 * addNote adds a new note to the specified incident.
 *
 * @param {string} id      The incident's id
 * @param {string} from    The email of a PagerDuty user
 * @param {object} payload The note payload to add to the incident
 *
 * @return {object} The response body
 */
async function addNote(id, from, payload) {
  try {
    const { body } = await pd.incidents.createNote(id, from, payload)
    return body
  } catch (err) {
    sdk.log(ux.colors.red(`${err}`))
    throw err
  }
}

/**
 * snoozeIncident snoozes an incident for a number of seconds.
 *
 * @param {string} id      The incident's id
 * @param {string} from    The email of a PagerDuty user
 * @param {object} payload The snooze payload to add to the incident with a duration in seconds
 *
 * @return {object} The response body
 */
async function snoozeIncident(id, from, payload) {
  try {
    const { body } = await pd.incidents.snoozeIncident(id, from, payload)
    return body
  } catch (err) {
    sdk.log(ux.colors.red(`${err}`))
  }
}

module.exports = {
  getUsers,
  matchUser,
  getEscalationPolicies,
  getEscalationPolicy,
  getServices,
  newIncident,
  initializePagerDuty,
  getOnCall,
  getIncidents,
  updateIncident,
  addNote,
  snoozeIncident,
}
