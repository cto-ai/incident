const { LOGO } = require('./logo')
const AUTH_FILE_NAME = 'auth.json'
const OP_CONFIG = '/root/.config/@cto.ai/ops/platform-solutions/incident/config'
const VALID_FLAGS = [
  '-l',
  '--list',
  '-s',
  '--search',
  '-c',
  '--create',
  '-u',
  '--update',
  '-o',
  '--onCall',
  '--build',
  '-h',
  '--help',
]
const URGENCIES = {
  '🔥   All customers are affected.': 'high',
  '😭   Large segment of customers are affected.': 'high',
  '😫   Small segment of customers are affected.': 'low',
  '😣   Site performance degraded for some customers.': 'low',
  '☹️    Potential issue, but customers are currently unaware.': 'low',
}

const SUCCESS_TAGS = ['track', 'incident', 'success']
const ERROR_TAGS = ['track', 'incident', 'errror']

module.exports = {
  LOGO,
  AUTH_FILE_NAME,
  OP_CONFIG,
  VALID_FLAGS,
  URGENCIES,
  SUCCESS_TAGS,
  ERROR_TAGS,
}
