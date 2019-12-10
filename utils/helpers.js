const { ux } = require('@cto.ai/sdk');
const path = require('path');
const fs = require('fs');
const { useOldAuthPrompt, newRunPrompts } = require('../prompts');

const OP_CONFIG = '/root/.config/@cto.ai/ops/platform-solutions/incident/config';
const validFlags = [
  '-l', '--list',
  '-s', '--search',
  '-c', '--create',
  '-u', '--update',
  '-o', '--onCall',
  '--build',
  '-h', '--help',
]

/**
 * getInitialJob returns the name of the users runtime selected job.
 *
 * @return {string} The name of the selected job
 */
function getInitialJob() {
  // Process passed arguments
  const argv = process.argv
  const flags = argv && argv.length ? argv.filter(arg => arg.startsWith('-')) : []

  // Validate the passed flags
  flags.map(f => {
    if (!validFlags.includes(f)) {
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
function writeToFileSync({
  dirPath,
  fileName,
  data,
}) {
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
  writeToFileSync({
    dirPath: OP_CONFIG,
    fileName: 'auth.json',
    data: JSON.stringify(authData),
  })
  return authData
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
  const authFile = `${OP_CONFIG}/auth.json`
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
  const urgencies = {
    '🔥   All customers are affected.': 'high',
    '😭   Large segment of customers are affected.': 'high',
    '😫   Small segment of customers are affected.': 'low',
    '😣   Site performance degraded for some customers.': 'low',
    '☹️    Potential issue, but customers are currently unaware.': 'low',
  }

  return urgencies[priority]
}

module.exports = {
  getInitialJob,
  writeToFileSync,
  retrieveAuth,
  getUrgency,
};
