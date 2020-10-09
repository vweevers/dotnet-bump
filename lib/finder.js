'use strict'

const glob = require('glob')
const isGlob = require('is-glob')
const parseSolution = require('vssln-parser')
const saxophonist = require('saxophonist')
const { pipeline, Writable } = require('readable-stream')
const after = require('after')
const once = require('once')
const path = require('path')
const fs = require('fs')
const Emitter = require('events').EventEmitter
const detectLanguage = require('language-detect')

const SOURCE_EXT_LANGUAGES = {
  '.cs': 'C#',
  '.csx': 'C#',
  '.fs': 'F#',
  '.fsx': 'F#'
}

const PROJECT_EXT_LANGUAGES = {
  '.csproj': 'C#',
  '.fsproj': 'F#'
}

const GLOB_IGNORE = [
  '**/{packages,bin,obj,OpenCover,TestResults,node_modules,.git}/**',
  '**/*.{json,md,tar,gz,zip,7z,vs,xml,txt,yml,js,dll,exe,pdb,node,lib,pb,html,config,user,config,manifest}'
]

module.exports = class Finder extends Emitter {
  constructor () {
    super()

    this.visited = {}
    this.result = new Map()
  }

  skip (type, file) {
    if (!this.visited[type]) this.visited[type] = new Set()
    else if (this.visited[type].has(file)) return true

    this.visited[type].add(file)
    return false
  }

  found (sourceFile, language, done) {
    if (language === 'C#' || language === 'F#') {
      this.result.set(sourceFile, { path: sourceFile, language })
    } else {
      const rel = path.relative('.', sourceFile)
      this.emit('warning', 'Ignoring "%s": %s is not supported', rel, language)
    }
  }

  find (input, opts, done) {
    const finish = (err) => {
      if (err) done(err)
      else done(null, Array.from(this.result.values()))
    }

    if (!input || input === '.') {
      this.scanDirectory(process.cwd(), finish)
    } else if (Array.isArray(input)) {
      const next = after(input.length, finish)
      input.forEach(subinput => this.find(subinput, opts, next))
    } else if (typeof input !== 'string') {
      throw new TypeError('Input must be a string or array')
    } else if (opts.glob !== false && isGlob(input)) {
      if (this.skip('glob', input)) return finish()

      glob(input, { absolute: true, matchBase: true, ignore: GLOB_IGNORE }, (err, files) => {
        if (err) return finish(err)

        const next = after(files.length, finish)
        files.forEach(file => this.processFile(file, next))
      })
    } else {
      this.processFile(input, finish)
    }
  }

  processFile (file, done) {
    file = path.resolve(file)
    if (this.skip('file', file)) return done()

    fs.stat(file, (err, stat) => {
      if (err) return done(err)

      if (stat.isDirectory()) {
        return this.scanDirectory(file, done)
      }

      const ext = path.extname(file).toLowerCase()

      if (ext === '.sln') {
        this.readSolution(file, done)
      } else if (PROJECT_EXT_LANGUAGES[ext]) {
        this.readProject(file, PROJECT_EXT_LANGUAGES[ext], done)
      } else if (SOURCE_EXT_LANGUAGES[ext]) {
        this.found(file, SOURCE_EXT_LANGUAGES[ext])
        done()
      } else {
        detectLanguage(file, (err, lang) => {
          if (err) return done(err)
          this.found(file, lang)
          done()
        })
      }
    })
  }

  readProject (projectFile, language, done) {
    if (this.skip('project', projectFile)) return done()

    const dir = path.dirname(projectFile)
    const source = fs.createReadStream(projectFile)
    const sax = saxophonist('Compile')

    const sink = new Writable({
      objectMode: true,
      write: (node, enc, next) => {
        const inc = node.attributes.Include
        if (!inc) return next()

        if (inc.includes('$')) {
          const rel = path.relative('.', projectFile)
          this.emit('warning', 'Ignoring "%s" in %s: variables are not supported', inc, rel)
          return next()
        }

        const file = path.resolve(dir, inc)
        const ext = path.extname(file)
        const language = SOURCE_EXT_LANGUAGES[ext]

        if (language && path.basename(file, ext).toLowerCase() === 'assemblyinfo') {
          this.found(file, language)
        }

        next()
      }
    })

    pipeline(source, sax, sink, done)
  }

  scanDirectory (dir, done) {
    if (this.skip('directory', dir)) return done()

    glob('*.{sln,csproj,fsproj}', { cwd: dir, nodir: true, absolute: true }, (err, files) => {
      if (err) return done(err)

      const next = after(files.length, done)

      for (const file of files) {
        const ext = path.extname(file)

        if (ext === '.sln') {
          this.readSolution(file, next)
        } else if (PROJECT_EXT_LANGUAGES[ext]) {
          this.readProject(file, PROJECT_EXT_LANGUAGES[ext], next)
        } else {
          next()
        }
      }
    })
  }

  readSolution (sln, done) {
    if (this.skip('solution', sln)) return done()

    done = once(done)

    parseSolution(fs.createReadStream(sln).on('error', done), (solution) => {
      if (done.called) return

      const root = path.dirname(sln)
      const next = after(solution.projects.length, done)

      solution.projects.forEach(project => {
        if (!project.typeGuid) {
          this.emit('warning', 'Ignoring invalid project "%s"', project.path)
        } else if (!project.type) {
          this.emit('warning', 'Ignoring project "%s": unknown type "%s"', project.path, project.typeGuid)
        } else if (project.type.indexOf('C#') >= 0) {
          return this.readProject(path.resolve(root, project.path), 'C#', next)
        } else if (project.type === 'F#') {
          return this.readProject(path.resolve(root, project.path), 'F#', next)
        } else if (project.type !== 'Solution Folder') {
          this.emit('warning', 'Ignoring project "%s": unsupported type "%s"', project.path, project.type)
        }

        next()
      })
    })
  }
}
