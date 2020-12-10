# dotnet-bump

**CLI to increment and tag assembly version(s) in a .NET project. Supports SDK-style and non-SDK projects.**

[![npm status](http://img.shields.io/npm/v/dotnet-bump.svg)](https://www.npmjs.org/package/dotnet-bump)
[![node](https://img.shields.io/node/v/dotnet-bump.svg)](https://www.npmjs.org/package/dotnet-bump)
![Test](https://github.com/vweevers/dotnet-bump/workflows/Test/badge.svg)
![Release](https://github.com/vweevers/dotnet-bump/workflows/Release/badge.svg)

## Table of Contents

<details><summary>Click to expand</summary>

- [Example](#example)
- [Usage](#usage)
  - [Options](#options)
- [Install](#install)
- [License](#license)

</details>

## Example

```
> dotnet-bump minor --dry-run
- Would stage Foo\Foo.csproj
- Would stage Bar\Properties\AssemblyInfo.cs
- Would commit and tag v1.1.0
```

```
> dotnet-bump minor
- Stage Foo\Foo.csproj
- Stage Bar\Properties\AssemblyInfo.cs
- Commit and tag v1.1.0
```

## Usage

```
dotnet-bump <target> [options] [file..]
```

Bump to `target` version, one of:

- A release type: `major`, `minor`, `patch`, `premajor`, `preminor`, `prepatch`, `prerelease`
  - The `major` type bumps the major version (for example `2.4.1 => 3.0.0`); `minor` and `patch` work the same way.
  - The `premajor` type bumps the version up to the next major version and down to a prerelease of that major version; `preminor` and `prepatch` work the same way.
  - The `prerelease` type works the same as `prepatch` if the input version is a non-prerelease. If the input is already a prerelease then it's simply incremented (for example `4.0.0-rc.2 => 4.0.0-rc.3`).
- A specific version like 2.4.0 (must be [semver](https://semver.org/)).

Files can be glob patterns or paths to a:

- Visual Studio Solution (`*.sln`) (parsed to find projects)
- Project (`*.csproj` or `*.fsproj`) (parsed to find a `Version` element or `AssemblyInfo` file)
- C# or F# source code file
- JSON or JSON5 file;
- Directory containing any of the above.

Default is the current working directory. Files must reside in a git working tree (or multiple working trees).

### Options

```
--dry-run  -d  Print changes but don't make them
--force    -f  Continue if git working tree(s) are dirty
--no-commit    Don't commit and tag
--no-glob      Disable globbing
--verbose      Verbose output
--version  -v  Print version and exit
--help     -h  Print usage and exit
```

## Install

Download [a portable binary](https://github.com/vweevers/dotnet-bump/releases) or install with [npm](https://npmjs.org):

```
npm install dotnet-bump --save-dev
```

## License

[MIT](LICENSE) © Vincent Weevers
