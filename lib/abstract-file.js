'use strict'

const path = require('path')

const kRoot = Symbol('kRoot')
const kRelative = Symbol('kRelative')

class AbstractFile {
  constructor (path) {
    this.path = path
    this[kRoot] = null
    this[kRelative] = null
  }

  set root (root) {
    this[kRoot] = root
    this[kRelative] = path.relative(root, this.path)
  }

  get root () {
    return this[kRoot]
  }

  get relative () {
    return this[kRelative]
  }

  read (callback) {
    this[AbstractFile.read](callback)
  }

  write (callback) {
    this[AbstractFile.write](callback)
  }

  get version () {
    return this[AbstractFile.getVersion]()
  }

  set version (version) {
    this[AbstractFile.setVersion](version)
  }
}

AbstractFile.read = Symbol('read')
AbstractFile.write = Symbol('write')
AbstractFile.getVersion = Symbol('getVersion')
AbstractFile.setVersion = Symbol('setVersion')

module.exports = AbstractFile
