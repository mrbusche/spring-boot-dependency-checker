# spring-boot-dependency-checker

A small utility that finds manually overridden dependencies in a Maven POM, Gradle file, or SBOM for a Spring Boot application.

## Usage

`npm install -g spring-boot-dependency-checker`

`spring-boot-dependency-checker location/to/pom.xml`

| File type      | Dependencies | Properties | Accurate |
|----------------|--------------|------------|----------|
| Maven POM      | &check;      | &check;    | &check;  |
| `build.gradle` | &check;      | &cross;    | &check;  |
| SBOM           | &check;      | &cross;    | &cross;  |

Maven POM is the most accurate because it's generated from the source file

build.gradle does not support overwritten properties because those usually come from a separate file

SBOM is accurate until you have dependencies that pull in newer versions than what Spring Boot recommends, which results in false positives
