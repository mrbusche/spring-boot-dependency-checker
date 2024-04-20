import { XMLParser } from 'fast-xml-parser';
import { readFileSync } from 'fs';

const parser = new XMLParser();
const xmlData = readFileSync('pom.xml', 'utf8');
let jObj = parser.parse(xmlData);

const properties = jObj.project.properties;
const dependenciesWithVersions = jObj.project.dependencies.dependency.filter(dep => dep.version)

let springBootVersion = '';
if (jObj.project.parent.groupId === 'org.springframework.boot' && jObj.project.parent.artifactId == 'spring-boot-starter-parent') {
    springBootVersion = jObj.project.parent.version;
}

console.log('springBootVersion', springBootVersion);
console.log('properties', properties);
console.log('dependenciesWithVersions', dependenciesWithVersions);
