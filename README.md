# dotnet-bump

**CLI to increment and tag assembly version(s) in a .NET project.**

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
- Would stage Foo\Properties\AssemblyInfo.cs
- Would stage FooTests\Properties\AssemblyInfo.cs
- Would commit and tag v1.1.0
```

```
> dotnet-bump minor
- Stage Foo\Properties\AssemblyInfo.cs
- Stage FooTests\Properties\AssemblyInfo.cs
- Commit and tag v1.1.0
```

## Usage

```
dotnet-bump <target> [options] [file..]
```

Bump to `target` version, one of:

- `major`, `minor`, `patch`;
- a specific version like 2.4.0 (must be [semver](https://semver.org/)).

Files can be glob patterns or paths to a:

- Visual Studio Solution (`*.sln`) (parsed to find projects)
- Project (`*.csproj` or `*.fsproj`) (parsed to find `AssemblyInfo`)
- C# or F# source code file;
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
