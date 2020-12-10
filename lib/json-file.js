'use strict'

const JSON5 = require('json5')
const fs = require('fs')
const AbstractFile = require('./abstract-file')

const kSource = Symbol('kSource')
const kKey = Symbol('kKey')
const kVersion = Symbol('kVersion')

class JsonFile extends AbstractFile {
  constructor (path, source, key, version) {
    super(path)

    this[kSource] = source
    this[kKey] = key
    this[kVersion] = version
  }

  [AbstractFile.read] (callback) {
    process.nextTick(callback)
  }

  [AbstractFile.write] (callback) {
    fs.writeFile(this.path, this[kSource], callback)
  }

  [AbstractFile.getVersion] () {
    return this[kVersion]
  }

  [AbstractFile.setVersion] (version) {
    // Search and replace JSON in order to preserve comments
    const key = this[kKey]
    const re = new RegExp(`"${key}"\\s*:\\s*"[^"]+"`)
    const source = this[kSource].replace(re, `"${key}": "${version}"`)

    // Check that the JSON is valid
    if (JSON5.parse(source)[key] !== version) {
      throw new Error('Failed to set ' + key)
    }

    this[kSource] = source
    this[kVersion] = version
  }
}

JsonFile.maybe = function (fp, source) {
  const data = JSON5.parse(source)

  for (const key of ['version', 'ProductVersion']) {
    const version = data[key]

    if (typeof version === 'string' && version.trim() !== '') {
      return new JsonFile(fp, source, key, version)
    }
  }
}

module.exports = JsonFile
