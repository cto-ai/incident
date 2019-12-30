const { ux, sdk } = require('@cto.ai/sdk')
const { LOGO } = require('./constants')
const { whichJobPrompt, shouldContinuePrompt } = require('./prompts')
const {
  createIncident,
  updateIncident,
  searchIncidents,
  whoOnCall,
} = require('./integrations/pagerDuty')
const { listIssues } = require('./integrations/gitlab')
const { retrieveAuth, getFlags, getInitialJob } = require('./utils/helpers')

// Map our job names to their functions
const jobs = {
  'Create an Incident': createIncident,
  'Update an Incident': updateIncident,
  'List Issues': listIssues,
  'Search for Incidents': searchIncidents,
  'List On-Call': whoOnCall,
}

async function main() {
  const user = await sdk.user().catch(err => sdk.log(err))
  const person = user && user.me ? `, ${user.me.username}` : ' there'
  const greeting = `\n👋  Welcome to Incident.sh  👋\n\nHi${person}!\n`

  // Attempt to parse the user's passed flags
  let initialJob
  try {
    initialJob = getInitialJob()
  } catch (err) {
    sdk.log(ux.colors.red(err.message))
    return
  }

  sdk.log(LOGO)
  sdk.log(greeting)

  // Attempt to retrieve previous auth config and prompt the user if they
  // want to use it or enter new details, use old if we have a runtime job
  const authData = await retrieveAuth(!!initialJob)

  // Extract job names from our jobs mapping
  const jobChoices = Object.keys(jobs)

  // Continue to prompt for jobs until the user is finished
  let run = true
  let initial = true
  while (run) {
    if (initial && initialJob) {
      // Run the runtime selected job
      initial = false
      await runJob(initialJob, authData, user)
    } else {
      // Run the user's selected job
      const { job } = await ux.prompt(whichJobPrompt(jobChoices))
      await runJob(job, authData, user)
    }

    // Let the user decide if they would like to preform another task
    const { shouldContinue } = await ux.prompt(shouldContinuePrompt)
    run = shouldContinue
  }

  sdk.log(ux.colors.magenta(`\nSee you later! 👋`))
}

/**
 * runJob calls the appropriate function from our jobs mapping.
 *
 * @param {string} job      The key for the selected job to run
 * @param {object} authData The auth data entered by the user
 * @param {object} user     The current SDK user
 */
async function runJob(job, authData, user) {
  console.log(jobs)
  await jobs[job](authData, user)
}

main()
