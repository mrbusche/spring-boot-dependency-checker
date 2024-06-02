# spring-boot-dependency-checker

A small utility that finds manually overridden dependencies in a Maven POM, or Gradle file for a Spring Boot application.

## Usage

`npm install -g spring-boot-dependency-checker`

`spring-boot-dependency-checker location/to/pom.xml`

| File type      | Dependencies | Properties |
| -------------- | ------------ | ---------- |
| Maven POM      | &check;      | &check;    |
| `build.gradle` | &check;      | &cross;    |

Maven POM is the most accurate because it's generated from the source file

build.gradle does not support overwritten properties because those usually come from a separate file
