const { sdk, ux } = require('@cto.ai/sdk')
const { gitIssues } = require('../utils/api/gitlab')

/**
 * listIssues retrieves issues from the GitLab API and formats results.
 *
 * @param {object} authData The user's entered auth data
 */
async function listIssues(authData) {
  const { gitlabToken, projectId } = authData
  sdk.log('')
  ux.spinner.start("Retrieving GitLab issues")
  const issues = await gitIssues(gitlabToken, projectId)
  ux.spinner.stop("Done!")

  if (!issues.length) {
    sdk.log(ux.colors.magenta("\nNo issues found!"))
    return
  }

  sdk.log(ux.colors.magenta("\nWe found the following open issues:\n"))
  issues.map(printIssue)
}

/**
 * printIssue pretty prints an issue.
 */
function printIssue(issue) {
  sdk.log(ux.colors.magenta(`\t${issue.title}`))
  sdk.log(`\t\tID: ${issue.id}`)
  sdk.log(`\t\tState: ${issue.state}`)
  sdk.log(`\t\tDescription: \n\t\t\t${issue.description.replace(/(?:\r\n|\r|\n)/g, '\n\t\t\t')}`)
  sdk.log(`\t\tCreated at: ${issue.created_at}`)
  sdk.log(`\t\tUpdated at: ${issue.updated_at}`)
  if (issue.weight) sdk.log(`\t\tWeight: ${issue.weight}`)
  if (issue.labels.length) {
    sdk.log(`\t\tLabels:`)
    issue.labels.map(label => sdk.log(`\t\t\t${label}`))
  }
  if (issue.assignees.length) {
    sdk.log(`\t\tAssignee(s):`)
    issue.assignees.map(({ name }) => sdk.log(`\t\t\t${name}`))
  }
  sdk.log(`\t\tAuthor:`)
  sdk.log(`\t\t\tName: ${issue.author.name}`)
  sdk.log(`\t\t\tUsername: ${issue.author.username}`)
  if (issue.due_date) sdk.log(`\t\tDue date: ${issue.due_date}`)
  sdk.log(`\t\tURL: ${issue.web_url}\n\n`)
}

module.exports = {
  listIssues,
}
