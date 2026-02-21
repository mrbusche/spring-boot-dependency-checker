# spring-boot-dependency-checker

A small utility that finds manually overridden dependencies in a Maven POM, or Gradle file for a Spring Boot application.

## Requirements

- Node.js 20 or higher

## Usage

`npm install -g spring-boot-dependency-checker`

`spring-boot-dependency-checker location/to/pom.xml`

Package entries in the JSON output include `versionComparison` with one of: `older`, `same`, or `newer` (comparing `inputFileVersion` against `bootVersion`).

| File type      | Dependencies | Properties |
| -------------- | ------------ | ---------- |
| Maven POM      | &check;      | &check;    |
| `build.gradle` | &check;      | &cross;    |

Maven POM is the most accurate because it's generated from the source file

build.gradle does not support overwritten properties because those usually come from a separate file
