const { sdk, ux } = require('@cto.ai/sdk')
const { SUCCESS_TAGS, ERROR_TAGS } = require('../constants')

async function handleError(err, eventStr) {
  await sdk.track(ERROR_TAGS, {
    event: `CTO.ai Incident.sh Op - ${eventStr}`,
    error: `Op Errored out: ${err}`,
  })
  // If not a fatal error, continue Op
  if (!err || !err.message) {
    return
  }
  if (err.response && err.response.status === 401) {
    await ux.spinner.stop('💩  Failed!')
    await ux.print(
      '😅  Unable to retrieve GitLab information due to permissions error. Please double check credentials entered!'
    )
  }
  if (err.response && err.response.status === 404) {
    await ux.spinner.stop('💩  Failed!')
    await ux.print(
      '🤔  Unable to find the GitLab project. Please double check the project ID entered!'
    )
  }
  if (err.message.includes('401')) {
    await ux.spinner.stop('💩  Failed!')
    await ux.print(
      '😓  Unable to retrieve PagerDuty information due to permissions error. Please double check credentials entered!'
    )
  }
  process.exit(1)
}

async function handleSuccess(event, eventStr) {
  await sdk.track(SUCCESS_TAGS, {
    event: `CTO.ai Incident.sh Op - ${eventStr}`,
    success: `Op Successfully Completed ${event}`,
  })
}

module.exports = {
  handleError,
  handleSuccess,
}
