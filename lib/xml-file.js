'use strict'

const fs = require('fs')
const AbstractFile = require('./abstract-file')

const kSource = Symbol('kSource')
const kNeedle = Symbol('kNeedle')
const kVersion = Symbol('kVersion')

module.exports = class XmlFile extends AbstractFile {
  constructor (path) {
    super(path)

    this[kSource] = null
    this[kNeedle] = null
    this[kVersion] = null
  }

  [AbstractFile.read] (callback) {
    this[kSource] = null
    this[kNeedle] = null
    this[kVersion] = null

    fs.readFile(this.path, 'utf8', (err, source) => {
      if (err) return callback(err)

      const match = /<version>\s*([\d.a-zA-Z-+]+)\s*<\/version>/i.exec(source)

      if (match && match[1].includes('.')) {
        const needle = match[0]
        const version = match[1]

        this[kSource] = source
        this[kNeedle] = needle
        this[kVersion] = version
      }

      callback()
    })
  }

  [AbstractFile.write] (callback) {
    if (this[kSource]) {
      fs.writeFile(this.path, this[kSource], callback)
    } else {
      process.nextTick(callback)
    }
  }

  [AbstractFile.getVersion] () {
    return this[kVersion]
  }

  [AbstractFile.setVersion] (version) {
    if (this[kSource]) {
      const needle = this[kNeedle]
      const tag = needle.startsWith('<Version>') ? 'Version' : 'version'
      const replacement = `<${tag}>${version}</${tag}>`

      this[kSource] = this[kSource].replace(needle, replacement)
      this[kNeedle] = replacement
      this[kVersion] = version
    }
  }
}
