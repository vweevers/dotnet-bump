'use strict'

const semver = require('semver')
const findRoots = require('common-roots')
const isDirty = require('is-dirty')
const after = require('after')
const series = require('run-series')
const cp = require('child_process')
const path = require('path')
const Emitter = require('events').EventEmitter
const Finder = require('./lib/finder')

const TARGETS = new Set(['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'])
const kLog = Symbol('kLog')

module.exports = class Updater extends Emitter {
  constructor (opts = {}) {
    super()

    // True by default
    this.glob = opts.glob == null ? true : !!opts.glob
    this.enableCommit = opts.commit == null ? true : !!opts.commit

    // False by default
    this.dryRun = !!opts.dryRun
    this.force = !!opts.force
    this.verbose = !!opts.verbose

    this.finder = new Finder()
    this.finder.on('warning', (...e) => this.emit('warning', ...e))
  }

  update (target, files, done) {
    if (typeof files === 'function') {
      done = files
      files = '.'
    }

    if (!TARGETS.has(target) && !semver.valid(target)) {
      const targets = Array.from(TARGETS).join(' | ')
      const msg = `Target must be ${targets} | x.x.x`

      return process.nextTick(done, new Error(msg))
    }

    this.finder.find(files, { glob: this.glob }, (err, files) => {
      if (err) return done(err)
      if (!files.length) return process.nextTick(done, null, files)

      // I don't like this API very much, need to simplify / refocus.
      findRoots(files.map(f => f.path), '.git', { map: true }, (err, roots, mapping) => {
        if (err) return done(err)

        const rootFiles = new Map()

        for (const file of files) {
          file.root = mapping[file.path]

          if (rootFiles.has(file.root)) rootFiles.get(file.root).push(file)
          else rootFiles.set(file.root, [file])
        }

        dirtyWorkingTrees(rootFiles.keys(), (err, dirtyTrees) => {
          if (err) return done(err)

          if (dirtyTrees.size && !this.force) {
            const desc = dirtyTrees.size > 1 ? 'Working trees are dirty' : 'Working tree is dirty'
            const paths = Array.from(dirtyTrees.keys()).join('\n- ')
            const hint = 'continue with --force'

            return done(new Error(`${desc} (${hint}):\n\n- ${paths}`))
          }

          series([
            (next) => readFiles(files, next),
            (next) => updateFiles(files, target, next),
            (next) => this.verify(files, next),
            (next) => this.save(files, next),
            (next) => this.stage(files, next),
            (next) => this.commit(files, roots, next)
          ], (err) => err ? done(err) : done(null, files))
        })
      })
    })
  }

  verify (files, done) {
    const counts = {}

    for (const { version } of files) {
      counts[version] = (counts[version] || 0) + 1
    }

    if (Object.keys(counts).length > 1) {
      const lines = []
      const skip = new Set()

      for (const { version, path } of files) {
        if (skip.has(version)) {
          continue
        } else if (counts[version] > 3) {
          skip.add(version)
          lines.push(`- ${shortPath(path)} (and ${counts[version] - 1} more): ${version}`)
        } else {
          lines.push(`- ${shortPath(path)}: ${version}`)
        }
      }

      return done(new Error(`Version mismatch between files:\n\n${lines.join('\n')}`))
    }

    done()
  }

  save (files, done) {
    if (this.dryRun) return process.nextTick(done)

    const next = after(files.length, done)

    for (const file of files) {
      file.write(next)
    }
  }

  [kLog] (msg, ...rest) {
    if (this.dryRun) {
      console.log(`- Would ${lcfirst(msg)}`, ...rest)
    } else {
      console.log(`- ${msg}`, ...rest)
    }
  }

  stage (files, done) {
    const commands = new Map()

    for (const file of files) {
      if (commands.has(file.root)) commands.get(file.root).push(file.relative)
      else commands.set(file.root, ['add', file.relative])

      this[kLog]('Stage %s', file.relative)
    }

    if (this.dryRun) return process.nextTick(done)

    const next = after(commands.size, done)

    for (const [cwd, args] of commands) {
      cp.execFile('git', args, { cwd }, next)
    }
  }

  commit (files, roots, done) {
    if (!this.enableCommit) return process.nextTick(done)

    const version = files[0].version
    const tag = 'v' + version
    const next = after(roots.length, done)

    for (const root of roots) {
      if (!this.dryRun && this.verbose) {
        const args = ['diff', '--staged', '--color']
        const opts = { cwd: root, encoding: 'utf8' }
        const staged = cp.execFileSync('git', args, opts)

        console.error('\n' + staged.trim() + '\n')
      }

      if (roots.length > 1) {
        this[kLog]('Commit and tag %s (%s)', tag, shortPath(root))
      } else {
        this[kLog]('Commit and tag %s', tag)
      }

      if (this.dryRun) {
        next()
        continue
      }

      cp.execFile('git', ['commit', '-m', version], { cwd: root }, (err) => {
        if (err) return next(err)
        cp.execFile('git', ['tag', '-a', tag, '-m', tag], { cwd: root }, next)
      })
    }
  }
}

function dirtyWorkingTrees (roots, done) {
  const dirtyTrees = new Map()
  const arr = Array.from(roots)
  const next = after(arr.length, (err) => done(err, dirtyTrees))

  for (const root of arr) {
    isDirty(root, (err, status) => {
      if (err) return next(err)
      if (status) dirtyTrees.set(root, status)

      next()
    })
  }
}

function readFiles (files, done) {
  const next = after(files.length, done)

  for (const file of files) {
    file.read(next)
  }
}

function updateFiles (files, target, done) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const currentRaw = file.version

    if (!currentRaw) {
      files.splice(i--, 1)
      continue
    }

    if (typeof currentRaw !== 'string') {
      return done(new Error(`Version is not a string in ${shortPath(file.path)}`))
    }

    const hasRevision = /^\d+\.\d+\.\d+\.\d+$/.test(currentRaw)
    const current = hasRevision ? currentRaw.split('.', 3).join('.') : currentRaw

    if (hasRevision) {
      // TODO: warn: 'Stripping revision number (".0") from non-semver version'
      // or require force.
    }

    if (!semver.valid(current)) {
      return done(new Error(`Current version ${currentRaw} is not semver-valid in ${shortPath(file.path)}`))
    }

    const next = TARGETS.has(target) ? semver.inc(current, target) : target

    if (current === next) {
      return done(new Error(`Target is equal to current version ${currentRaw} in ${shortPath(file.path)}`))
    }

    file.version = next
  }

  if (!files.length) {
    return done(new Error('None of the files contain a version'))
  }

  done()
}

function shortPath (file) {
  return path.relative('.', file) || '.'
}

function lcfirst (str) {
  return str[0].toLowerCase() + str.slice(1)
}
