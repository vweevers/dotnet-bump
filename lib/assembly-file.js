'use strict'

const Assembly = require('assembly-source')
const fs = require('fs')
const AbstractFile = require('./abstract-file')
const kAssembly = Symbol('kAssembly')

module.exports = class AssemblyFile extends AbstractFile {
  constructor (path, language) {
    super(path)

    this[kAssembly] = null
  }

  [AbstractFile.read] (callback) {
    this[kAssembly] = null

    fs.readFile(this.path, 'utf8', (err, source) => {
      if (err) return callback(err)

      this[kAssembly] = Assembly(source)
      callback()
    })
  }

  [AbstractFile.write] (callback) {
    fs.writeFile(this.path, this[kAssembly].toSource(), callback)
  }

  [AbstractFile.getVersion] () {
    return this[kAssembly].get('AssemblyVersion')
  }

  [AbstractFile.setVersion] (version) {
    this[kAssembly].set('AssemblyVersion', version)

    for (const additional of ['AssemblyFileVersion', 'AssemblyInformationalVersion']) {
      if (this[kAssembly].get(additional) != null) {
        this[kAssembly].set(additional, version)
      }
    }
  }
}
