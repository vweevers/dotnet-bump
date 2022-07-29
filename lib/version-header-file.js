'use strict'

const fs = require('fs')
const AbstractFile = require('./abstract-file')

const kSource = Symbol('kSource')
const kConstants = Symbol('constants')

class VersionHeaderFile extends AbstractFile {
  constructor (path, source, constants) {
    super(path)

    this[kSource] = source
    this[kConstants] = constants
  }

  [AbstractFile.read] (callback) {
    process.nextTick(callback)
  }

  [AbstractFile.write] (callback) {
    fs.writeFile(this.path, this[kSource], callback)
  }

  [AbstractFile.getVersion] () {
    return Array.from(this[kConstants]).slice(0, 3).map(x => x.value).join('.')
  }

  [AbstractFile.setVersion] (version) {
    const parts = version.split(/[.+-]/).slice(0, 3).map(x => parseInt(x, 10))

    if (!parts.every(Number.isInteger)) {
      return
    }

    for (const constant of this[kConstants]) {
      const value = parts.shift() || 0
      const oldDirective = constant.directive
      const newDirective = `#define ${constant.name} ${value}`

      this[kSource] = this[kSource].replace(oldDirective, newDirective)

      constant.directive = newDirective
      constant.value = value
    }
  }
}

VersionHeaderFile.maybe = function (fp) {
  const source = fs.readFileSync(fp, 'utf8')
  const lines = source.split(/[\r\n]+/)
  const constants = []

  // Look for common combinations of constants
  const combos = [
    ['VERSION_MAJOR', 'VERSION_MINOR', 'VERSION_BUILD', 'VERSION_REVISION'],
    ['VERSION_MAJOR', 'VERSION_MINOR', 'VERSION_PATCH', 'VERSION_BUILD'],
    ['VERSION_MAJOR', 'VERSION_MINOR', 'VERSION_PATCH']
  ]

  for (const line of lines) {
    const match = /^#define\s+(VERSION_(?:MAJOR|MINOR|PATCH|BUILD|REVISION))\s+(\d+)$/
      .exec(line)

    if (match !== null) {
      const [directive, name, value] = match
      constants.push({ name, directive, value: parseInt(value, 10) })
    }
  }

  for (const combo of combos) {
    // Order matters
    if (combo.length === constants.length &&
      combo.every((name, i) => constants[i].name === name)) {
      return new VersionHeaderFile(fp, source, constants)
    }
  }
}

module.exports = VersionHeaderFile
