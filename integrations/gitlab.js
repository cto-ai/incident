const { ux } = require('@cto.ai/sdk')
const { gitIssues } = require('../utils/api/gitlab')
const { magenta } = ux.colors
/**
 * listIssues retrieves issues from the GitLab API and formats results.
 *
 * @param {object} authData The user's entered auth data
 */
async function listIssues(authData) {
  const { gitlabToken, projectId } = authData
  await ux.spinner.start('🏃‍ Retrieving GitLab issues')
  const issues = await gitIssues(gitlabToken, projectId)

  if (!issues.length) {
    await ux.print()
    await ux.spinner.stop(magenta('🤷‍  No issues found!'))
    return
  }
  await ux.spinner.stop('✅ Retrieved GitLab issues!')
  const titleStr = magenta('\n📈 Here are the currently open issues:')
  const issueStr = issues.map(printIssue)
  await ux.print(`${titleStr}\n${issueStr.join('')}`)
}

/**
 * printIssue pretty prints an issue.
 */
function printIssue(issue) {
  let issueStr = `\n${magenta(`\t${issue.title}`)}
  \t\tID: ${issue.id}
  \t\tState: ${issue.state}
  \t\tDescription: \n\t\t\t${issue.description.replace(
    /(?:\r\n|\r|\n)/g,
    '\n\t\t\t'
  )}
  \t\tCreated at: ${issue.created_at}
  \t\tUpdated at: ${issue.updated_at}`
  if (issue.weight) issueStr += `\n\t\tWeight: ${issue.weight}`
  if (issue.labels.length) {
    issueStr += `\n\t\tLabels:`
    issue.labels.forEach(label => (issueStr += ` ${label}`))
  }
  if (issue.assignees.length) {
    issueStr += `\n\t\tAssignee(s):`
    issue.assignees.forEach(({ name }) => (issueStr += `\n\t\t\t${name}`))
  }
  issueStr += `\n\t\tAuthor: ${issue.author.name} - ${issue.author.username}`
  if (issue.due_date) issueStr += `\n\t\tDue date: ${issue.due_date}`
  issueStr += `\n\t\tURL: ${issue.web_url}\n`
  return issueStr
}

module.exports = {
  listIssues,
}
