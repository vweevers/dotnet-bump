# Changelog

## [1.5.0] - 2021-09-08

### Added

- Add preliminary support of C++ (vcxproj) projects ([`d4e2ab7`](https://github.com/vweevers/dotnet-bump/commit/d4e2ab7))

### Fixed

- Bump `common-roots` from 0.0.1 to 0.0.2 (closes [#1](https://github.com/vweevers/dotnet-bump/issues/1)) ([`86bf2e5`](https://github.com/vweevers/dotnet-bump/commit/86bf2e5)).

## [1.4.0] - 2021-06-09

### Added

- Auto-stage upgrade guide and readme (in addition to changelog) ([`743d94f`](https://github.com/vweevers/dotnet-bump/commit/743d94f))
- Support `AssemblyInfo.cs` in SDK project that doesn't explicitly include it ([`f7167c1`](https://github.com/vweevers/dotnet-bump/commit/f7167c1))

## [1.3.2] - 2021-01-19

### Fixed

- Replace `is-dirty` dependency ([`133eb8b`](https://github.com/vweevers/dotnet-bump/commit/133eb8b)).

## [1.3.1] - 2021-01-02

### Fixed

- Fix staging of changelog when `--force` is present ([`d445594`](https://github.com/vweevers/dotnet-bump/commit/d445594))

## [1.3.0] - 2020-12-22

### Added

- Support `.nuspec` files ([`3ea3d74`](https://github.com/vweevers/dotnet-bump/commit/3ea3d74))

## [1.2.0] - 2020-12-10

### Added

- Allow dirty `CHANGELOG.md`, committed together with version ([`36f1e40`](https://github.com/vweevers/dotnet-bump/commit/36f1e40))
- Support json(5) files ([`4db88fe`](https://github.com/vweevers/dotnet-bump/commit/4db88fe))

### Fixed

- Fix repeated `setVersion()` on project file ([`8682d96`](https://github.com/vweevers/dotnet-bump/commit/8682d96))
- Fix missing callback ([`5117188`](https://github.com/vweevers/dotnet-bump/commit/5117188))

## [1.1.0] - 2020-10-14

### Added

- Support SDK-style projects with a `Version` ([`fab97c7`](https://github.com/vweevers/dotnet-bump/commit/fab97c7))

## [1.0.0] - 2020-10-10

First release. :seedling:

[1.5.0]: https://github.com/vweevers/dotnet-bump/releases/tag/v1.5.0

[1.4.0]: https://github.com/vweevers/dotnet-bump/releases/tag/v1.4.0

[1.3.2]: https://github.com/vweevers/dotnet-bump/releases/tag/v1.3.2

[1.3.1]: https://github.com/vweevers/dotnet-bump/releases/tag/v1.3.1

[1.3.0]: https://github.com/vweevers/dotnet-bump/releases/tag/v1.3.0

[1.2.0]: https://github.com/vweevers/dotnet-bump/releases/tag/v1.2.0

[1.1.0]: https://github.com/vweevers/dotnet-bump/releases/tag/v1.1.0

[1.0.0]: https://github.com/vweevers/dotnet-bump/releases/tag/v1.0.0
