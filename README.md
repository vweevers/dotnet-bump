# dotnet-bump

**CLI to increment and git-tag the version of .NET, C(++) and npm projects.** Geared towards Visual Studio projects.

[![npm status](http://img.shields.io/npm/v/dotnet-bump.svg)](https://www.npmjs.org/package/dotnet-bump)
[![node](https://img.shields.io/node/v/dotnet-bump.svg)](https://www.npmjs.org/package/dotnet-bump)
![Test](https://github.com/vweevers/dotnet-bump/workflows/Test/badge.svg)
![Release](https://github.com/vweevers/dotnet-bump/workflows/Release/badge.svg)
[![Common Changelog](https://common-changelog.org/badge.svg)](https://common-changelog.org)

## Example

```
> dotnet-bump minor --dry-run
- Would stage Foo\Foo.csproj
- Would stage Bar\version.h
- Would commit and tag v1.1.0
```

```
> dotnet-bump minor
- Stage Foo\Foo.csproj
- Stage Bar\version.h
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

- `*.sln` Visual Studio solution (parsed to find projects)
- `*.csproj` or `*.fsproj` project (parsed to find a `Version` element or `AssemblyInfo` file)
- `*.cs` or `*.fs` file (containing assembly attributes, see below)
- `*.nuspec` file (containing a `version` element)
- `*.vcxproj` project (used to discover `version.h` files in the same directory)
- `version.h` file (see below)
- `*.json` or `*.json5` file (containing a `version`);
- Directory containing any of the above.

Default is the current working directory. Files must reside in a git working tree (or multiple working trees).

Glob patterns must use forward slashes (`/`) even on Windows, because the backward slash (`\`) is an escape character. This means `dotnet-bump patch example\*.h` should be `dotnet-bump patch example/*.h`. Backward slashes do work if the given argument is not a glob pattern, because `dotnet-bump` will interpret it as a file path: `dotnet-bump patch example\version.h`.

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

## Supported patterns

### .NET projects

Both legacy-style projects (that use assembly attributes) and SDK-style projects (that commonly use a `Version` element) are supported. For example, `dotnet-bump` would replace the `1.2.3` string here:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <Version>1.2.3</Version>
  </PropertyGroup>
</Project>
```

If the project is published as a NuGet package, the project version can usually serve as the source of truth. Other times a custom `*.nuspec` file may be necessary. For example:

```xml
<package xmlns="..">
  <metadata>
    <id>Example</id>
    <version>1.2.3</version>
  </metadata>
  <files>
    <file src="Example.dll" target="build\native\x64\bin" />
    <file src="Example.targets" target="build\Example.targets" />
  </files>
</package>
```

### Assembly attributes (C# / F#)

If an `AssemblyInfo.cs` file is found then `dotnet-bump` will replace the following attribute and leave other attributes as-is. If a version has four numeric components (`1.2.3.0`) then the last component (`.0`) will be stripped.

```cs
[assembly: AssemblyVersion("1.2.3")]
```

If `AssemblyFileVersion` and / or `AssemblyInformationalVersion` attributes are present they will be updated as well, but only if `AssemblyVersion` is present because it is used to determine the current version.

```cs
[assembly: AssemblyFileVersion("1.2.3")]
[assembly: AssemblyInformationalVersion("1.2.3")]
```

### `version.h` (C / C++)

One of the following combination of constants can be used, and must be written exactly as below with optional added whitespace (though `dotnet-bump` will strip such whitespace). Other lines in the `version.h` file will be left alone.

```c
#define VERSION_MAJOR 1
#define VERSION_MINOR 2
#define VERSION_PATCH 3
```

```c
#define VERSION_MAJOR 1
#define VERSION_MINOR 2
#define VERSION_PATCH 3
#define VERSION_BUILD 0
```

```c
#define VERSION_MAJOR 1
#define VERSION_MINOR 2
#define VERSION_BUILD 3
#define VERSION_REVISION 0
```

If the combination has four constants, the last constant will be ignored (on read) and set to `0` (on write).

## Install

Download [a portable binary](https://github.com/vweevers/dotnet-bump/releases) or install with [npm](https://npmjs.org):

```
npm install dotnet-bump --save-dev
```

## License

[MIT](LICENSE) © Vincent Weevers
