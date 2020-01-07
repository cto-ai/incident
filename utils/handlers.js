const { sdk, ux } = require('@cto.ai/sdk')
const { SUCCESS_TAGS, ERROR_TAGS } = require('../constants')
const { magneta } = ux.colors

async function printErrorMsg(errorStr) {
  await ux.spinner.stop('💩  Failed!')
  await ux.print(errorStr)
}

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
    await printErrorMsg(
      '😅  Unable to retrieve GitLab information due to permissions error. Please double check credentials entered!'
    )
  }
  if (err.response && err.response.status === 404) {
    await printErrorMsg(
      '🤔  Unable to find the GitLab project. Please double check the project ID entered!'
    )
  }
  if (err.message.includes('401')) {
    await printErrorMsg(
      '😓  Unable to retrieve PagerDuty information due to permissions error. Please double check credentials entered!'
    )
  }
  if (err.message.includes('400')) {
    await printErrorMsg(
      '😓  Unable to retrieve information from PagerDuty due to a bad request. Please double check the selected query options.'
    )
  }
  if (err.message.includes('ECONNREFUSED')) {
    await printErrorMsg(
      '😓  Failed to post to slack webhook! Please double check the webhook link entered!'
    )
  }
  if (err.message.includes('Incident Already Resolved')) {
    await ux.print(magneta('\nIncident already resolved!\n'))
    return {}
  }
  await ux.print('❗ The Op will now exit!')
  process.exit(1)
}

async function handleSuccess(eventStr, context) {
  await sdk.track(SUCCESS_TAGS, {
    event: `CTO.ai Incident.sh Op - ${eventStr}`,
    context,
  })
}

module.exports = {
  handleError,
  handleSuccess,
}
