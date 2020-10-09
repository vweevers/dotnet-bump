#!/usr/bin/env node
'use strict'

const Updater = require('.')
const minimist = require('minimist')

const argv = minimist(process.argv.slice(2), {
  boolean: [
    'dryRun',
    'glob',
    'force',
    'commit',
    'verbose',
    'version',
    'help'
  ],
  alias: {
    d: 'dryRun',
    'dry-run': 'dryRun',
    g: 'glob',
    f: 'force',
    v: 'version',
    h: 'help'
  },
  default: {
    dryRun: false,
    glob: true,
    commit: true,
    force: false,
    verbose: false,
    version: false,
    help: false
  }
})

const target = argv._[0]
const files = argv._.slice(1)

if (argv.version) {
  console.log('dotnet-bump v%s', require('./package.json').version)
  process.exit(0)
}

if (!target || argv.help) {
  const path = require('path')
  const usageFile = path.join(__dirname, 'usage.txt')
  const usage = require('fs').readFileSync(usageFile, 'utf8').trim()

  if (argv.help) {
    console.log(usage)
    process.exit(0)
  } else {
    console.error(usage)
    console.error('\nA target is required.')
    process.exit(1)
  }
}

if (!files.length) {
  files.push('.')
}

new Updater(argv).on('warning', warn).update(target, files, (err, files) => {
  if (err && argv.verbose) {
    throw err
  } else if (err) {
    console.error(err.message || err)
    process.exit(1)
  } else if (files.length === 0) {
    console.error('0 matching files.')
    process.exit(1)
  }
})

function warn (message, ...args) {
  console.error('Warning. ' + message, ...args)
}
