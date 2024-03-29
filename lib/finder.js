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
const AssemblyFile = require('./assembly-file')
const XmlFile = require('./xml-file')
const JsonFile = require('./json-file')
const VersionHeaderFile = require('./version-header-file')

const SOURCE_EXT_LANGUAGES = {
  '.cs': 'C#',
  '.csx': 'C#',
  '.fs': 'F#',
  '.fsx': 'F#'
}

const PROJECT_EXT_LANGUAGES = {
  '.csproj': 'C#',
  '.fsproj': 'F#',
  '.vcxproj': 'C++'
}

const GLOB_IGNORE = [
  '**/{packages,bin,obj,OpenCover,TestResults,node_modules,.git}/**',
  '**/*.{md,tar,gz,zip,7z,vs,xml,txt,yml,js,dll,exe,pdb,node,lib,pb,html,config,user,config,manifest,rc}'
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

  found (file) {
    this.result.set(file.path, file)
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
      } else if (ext === '.json' || ext === '.json5') {
        this.readJson(file, done)
      } else if (ext === '.nuspec') {
        this.readNuspec(file)
        done()
      } else if (path.basename(file) === 'version.h') {
        this.readVersionHeader(file)
        done()
      } else if (PROJECT_EXT_LANGUAGES[ext]) {
        this.readProject(file, PROJECT_EXT_LANGUAGES[ext], done)
      } else if (SOURCE_EXT_LANGUAGES[ext]) {
        this.found(new AssemblyFile(file, SOURCE_EXT_LANGUAGES[ext]))
        done()
      } else {
        detectLanguage(file, (err, lang) => {
          if (err) return done(err)
          this.found(new AssemblyFile(file, lang))
          done()
        })
      }
    })
  }

  readJson (jsonFile, done) {
    if (this.skip('json', jsonFile)) return done()

    fs.readFile(jsonFile, 'utf8', (err, source) => {
      if (err) return done(err)

      const result = JsonFile.maybe(jsonFile, source)
      if (result) this.found(result)

      done()
    })
  }

  readProject (projectFile, language, done) {
    if (this.skip('project', projectFile)) return done()

    if (language === 'C#' || language === 'F#') {
      this.found(new XmlFile(projectFile))
    }

    const dir = path.dirname(projectFile)
    const ext = path.extname(projectFile)
    const projectName = path.basename(projectFile, ext)

    const nuspecFile = path.join(dir, projectName + '.nuspec')
    if (fs.existsSync(nuspecFile)) this.readNuspec(nuspecFile)

    // Include debug variants of nuget packages. Is there a convention for this?
    const nuspecDebugFile = path.join(dir, projectName + '.Debug.nuspec')
    if (fs.existsSync(nuspecDebugFile)) this.readNuspec(nuspecDebugFile)

    const versionHeaderFile = path.join(dir, 'version.h')
    if (fs.existsSync(versionHeaderFile)) this.readVersionHeader(versionHeaderFile)

    if (language !== 'C#' && language !== 'F#') {
      return done()
    }

    // Odd case: SDK-style project that doesn't (need to) list files with Compile but
    // does have a custom Properties\AssemblyInfo.cs (in favor of GenerateAssemblyInfo).
    const assemblyFile = path.join(dir, 'Properties', 'AssemblyInfo.cs')
    if (fs.existsSync(assemblyFile)) this.found(new AssemblyFile(assemblyFile, 'C#'))

    const source = fs.createReadStream(projectFile)
    const sax = saxophonist('Compile')

    // TODO: use a simpler non-streaming xml parser
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
          this.found(new AssemblyFile(file, language))
        }

        next()
      }
    })

    pipeline(source, sax, sink, done)
  }

  readNuspec (nuspecFile) {
    if (this.skip('nuspec', nuspecFile)) return
    this.found(new XmlFile(nuspecFile))
  }

  readVersionHeader (versionHeaderFile) {
    if (this.skip('versionheader', versionHeaderFile)) return
    const result = VersionHeaderFile.maybe(versionHeaderFile)
    if (result) this.found(result)
  }

  scanDirectory (dir, done) {
    if (this.skip('directory', dir)) return done()

    glob('{*,config/*}.{sln,csproj,fsproj,vcxproj,json,json5,nuspec,h}', { cwd: dir, nodir: true, absolute: true }, (err, files) => {
      if (err) return done(err)

      const next = after(files.length, done)

      for (const unixy of files) {
        const file = path.normalize(unixy)
        const ext = path.extname(file)

        // TODO: merge logic with processFile()
        if (ext === '.sln') {
          this.readSolution(file, next)
        } else if (ext === '.json' || ext === '.json5') {
          this.readJson(file, next)
        } else if (ext === '.nuspec') {
          this.readNuspec(file)
          next()
        } else if (path.basename(file) === 'version.h') {
          this.readVersionHeader(file)
          next()
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
        } else if (project.path.endsWith('.csproj')) {
          return this.readProject(path.resolve(root, project.path), 'C#', next)
        } else if (project.path.endsWith('.fsproj')) {
          return this.readProject(path.resolve(root, project.path), 'F#', next)
        } else if (!project.type) {
          this.emit('warning', 'Ignoring project "%s": unknown type "%s"', project.path, project.typeGuid)
        } else if (project.type.indexOf('C#') >= 0) {
          return this.readProject(path.resolve(root, project.path), 'C#', next)
        } else if (project.type === 'F#') {
          return this.readProject(path.resolve(root, project.path), 'F#', next)
        } else if (project.type.indexOf('C++') >= 0) {
          return this.readProject(path.resolve(root, project.path), 'C++', next)
        } else if (project.type !== 'Solution Folder') {
          this.emit('warning', 'Ignoring project "%s": unsupported type "%s"', project.path, project.type)
        }

        next()
      })
    })
  }
}
