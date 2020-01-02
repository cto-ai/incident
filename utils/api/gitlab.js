const { ux } = require('@cto.ai/sdk')
const moment = require('moment')
require('moment-timezone')
const { Gitlab } = require('gitlab')

/**
 * createGitlabIssue consolidates user info into a new GitLab issue.
 *
 * @param {string} token   The GitLab access token to use
 * @param {object} summary The Summary of the issue to create
 *
 * @return {string} The URL of the newly created issue
 */
async function createGitlabIssue(token, projectId, summary) {
  await ux.spinner.start(`Creating GitLab Issue in Project ${projectId}`)
  const api = new Gitlab({
    host: 'https://git.cto.ai',
    token,
  })

  let description = `# Start Time \n ${summary.started_at} \n # Impact \n ${summary.impact} \n # Timeline \n`
  summary.timeline.map(timeline => {
    const ts = moment(timeline.ts)
      .tz(moment.tz.guess())
      .format('h:MM A z on dddd, MMMM D, YYYY')
    description = description.concat(
      `### ${timeline.status} : ${ts}\n - ${timeline.message}\n`
    )
  })

  try {
    const issue = await api.Issues.create(projectId, {
      title: summary.description,
      description,
      labels: 'incident.sh',
    })
    await ux.spinner.stop('Done!')
    return issue.web_url
  } catch (err) {
    await ux.spinner.stop('ERROR!')
    throw err
  }
}

/**
 * gitIssues gets all open issues in the given project.
 *
 * @param {string} token     The GitLab API key
 * @param {string} projectId The project ID to search in
 *
 * @return {array} The matching issues found
 */
async function gitIssues(token, projectId) {
  const api = new Gitlab({
    host: 'https://git.cto.ai',
    token,
  })
  const results = await api.Issues.all({
    projectId,
    groupId: null,
    scope: 'all',
    state: 'opened',
  })
  return results
}

module.exports = {
  createGitlabIssue,
  gitIssues,
}
