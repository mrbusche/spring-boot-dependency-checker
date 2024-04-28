# spring-boot-dependency-checker

A small utility that finds manually overridden dependencies in a Maven POM, Gradle file, or SBOM for a Spring Boot application.

## Usage

`npm install -g spring-boot-dependency-checker`

`spring-boot-dependency-checker location/to/pom.xml`

| File type       | Dependencies | Properties | Accurate |
|-----------------|--------------|------------|----------|
| Maven POM       | &check;      | &check;    | &check;  |
| Gradle - Groovy | &check;      | &cross;    | &check;  |
| SBOM            | &check;      | &cross;    | &cross;  |

Maven POM is the most accurate because it comes from the source file

Gradle - Groovy does not support overwritten properties because those generally come from a separate file

SBOM is accurate until you have dependencies that pull in newer versions that what Spring Boot recommends