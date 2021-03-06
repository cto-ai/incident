const { ux } = require('@cto.ai/sdk')
const path = require('path')
const fs = require('fs')
const { useOldAuthPrompt, newRunPrompts, userPrompts } = require('../prompts')
const {
  AUTH_FILE_NAME,
  OP_CONFIG,
  VALID_FLAGS,
  URGENCIES,
} = require('../constants')

/**
 * getInitialJob returns the name of the users runtime selected job.
 *
 * @return {string} The name of the selected job
 */
function getInitialJob() {
  // Process passed arguments
  const argv = process.argv
  const flags =
    argv && argv.length ? argv.filter(arg => arg.startsWith('-')) : []

  // Validate the passed flags
  flags.map(f => {
    if (!VALID_FLAGS.includes(f)) {
      throw new Error('Invalid flag passed! Exiting...')
    }
  })

  switch (flags[0]) {
    case '-l':
    case '--list':
      return 'List issues'
    case '-s':
    case '--search':
      return 'Search for incidents'
    case '-c':
    case '--create':
      return 'Create an incident'
    case '-u':
    case '--update':
      return 'Update an incident'
    case '-o':
    case '--onCall':
      return 'List On-Call'
    default:
      return null
  }
}

/**
 * writeToFileSync syncronously writes data to a file.
 *
 * @param {string}        dirPath  The directory to write to
 * @param {string}        fileName The name of the file to write to
 * @param {string|Buffer} data The data to write
 */
function writeToFileSync({ dirPath, fileName, data }) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    const filePath = path.resolve(dirPath, fileName)
    fs.writeFileSync(filePath, data, 'utf8')
  } catch (err) {
    console.error('Error writing file:', err)
  }
}

/**
 * promptForAuth asks the user for their auth details and saves them to our
 * config.
 */
async function promptForAuth() {
  authData = await ux.prompt(newRunPrompts)
  let me = await ux.prompt(userPrompts)
  writeToFileSync({
    dirPath: OP_CONFIG,
    fileName: AUTH_FILE_NAME,
    data: JSON.stringify({ authData, user: { me } }),
  })
  return { authData, user: { me } }
}

/**
 * retrieveAuth checks for previously defined authentication configurations.
 *
 * @param {boolean} initialSelected The user selected a job at runtime
 *
 * @return {object} The stored auth config key/values or an empty object
 */
async function retrieveAuth(initialSelected) {
  let authData
  const authFile = `${OP_CONFIG}/${AUTH_FILE_NAME}`
  if (!fs.existsSync(authFile)) {
    authData = await promptForAuth()
    return authData
  }
  authData = JSON.parse(fs.readFileSync(authFile, 'utf8'))

  // The user selected a job at runtime, so assume the old auth is desired
  if (initialSelected) return authData

  const { useOld } = await ux.prompt(useOldAuthPrompt)
  if (!useOld) {
    authData = await promptForAuth()
    return authData
  }

  if (!Object.keys(authData).length) {
    authData = await promptForAuth()
  }

  return authData
}

/**
 * getUrgency maps our natural language urgency to PagerDuty urgency levels.
 *
 * @param {string} priority The natural language priority string chosen by the user
 *
 * @return {string} The PagerDuty urgency level
 */
function getUrgency(priority) {
  return URGENCIES[priority]
}

module.exports = {
  getInitialJob,
  writeToFileSync,
  retrieveAuth,
  getUrgency,
}
