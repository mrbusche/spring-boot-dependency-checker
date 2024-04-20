import { XMLParser } from 'fast-xml-parser';
import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'node-html-parser';

const cachePath = '.cache';

const getXMLFromFile = async (filename) => {
    try {
        const parser = new XMLParser();
        const xmlData = readFileSync('pom.xml', 'utf8');
        return parser.parse(xmlData);
    } catch (err) {
        return [];
    }
}

const getSpringBootVersion = async(parsedPom) => {
    if (parsedPom.project.parent.groupId === 'org.springframework.boot' && parsedPom.project.parent.artifactId == 'spring-boot-starter-parent') {
        return parsedPom.project.parent.version;
    }
    console.log('No Spring Boot version found.');
    return '';
}

const downloadSpringVersionProperties = async (sbVersion) => {
    const response = await fetch(`https://docs.spring.io/spring-boot/docs/${sbVersion}/reference/html/dependency-versions.html`);
    const versions = [];
    switch (response.status) {
        // status "OK"
        case 200: {
            const template = await response.text();
            const parsedTemplate = parse(template);
            const tableBody = parsedTemplate.getElementsByTagName('tbody')[1];

            tableBody.childNodes.forEach(child => // there's a header row we should skip
                child.childNodes.length === 0 ? '' : versions.push({
                    property: child.childNodes[3].rawText,
                }));
            await writeFileSync(`${cachePath}/properties_${sbVersion}.json`, JSON.stringify(versions, null, 2));
            break;
        }
        case 404:
            await writeFileSync(`${cachePath}/properties_${sbVersion}.json`, JSON.stringify(versions, null, 2));
            console.log('URL not found - Spring Boot default versions URL no longer exists.');
            break;
    }
};

(async () => {
    const start = Date.now();

    const parsedPom = await getXMLFromFile('pom.xml');
    const properties = parsedPom.project.properties;
    const dependenciesWithVersions = parsedPom.project.dependencies.dependency.filter(dep => dep.version)
    const springBootVersion = await getSpringBootVersion(parsedPom);
    console.log('springBootVersion', springBootVersion);
    console.log('properties', properties);
    console.log('dependenciesWithVersions', dependenciesWithVersions);
    // const defaultComponents = await getSpringBootVersion()

    await downloadSpringVersionProperties(springBootVersion);
    // await downloadSpringVersionProperties(process.argv[2]);
    console.log(`Process took ${Date.now() - start} ms`);
})();