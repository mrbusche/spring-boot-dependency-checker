import { XMLParser } from 'fast-xml-parser';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'node-html-parser';
import { cachePath, ensureDirExists, getDefaultSpringBootVersions, getJsonFromFile, Package } from './shared.js';

export const getXMLFromFile = async (filename) => {
    try {
        const parser = new XMLParser();
        const xmlData = readFileSync(filename, 'utf8');
        return parser.parse(xmlData);
    } catch (err) {
        return [];
    }
};

const getPomProperties = async (parsedPom) => {
    const properties = parsedPom.project.properties;
    return Object.keys(properties);
};

const getSpringBootProperties = async (filename) => {
    await getSpringDefaultProperties(filename);
    return getJsonFromFile(`${cachePath}/properties_${filename}.json`);
};

const getPomDependenciesWithVersions = async (parsedPom) => {
    return parsedPom.project.dependencies.dependency.filter(dep => dep.version);
};

const getPomSpringBootVersion = async (parsedPom) => {
    if (parsedPom.project.parent.groupId === 'org.springframework.boot' && parsedPom.project.parent.artifactId === 'spring-boot-starter-parent') {
        return parsedPom.project.parent.version;
    }
    console.log('No Spring Boot version found.');
    return '';
};

export const retrieveSimilarPomPackages = async (parsedPom) => {
    const pomDependenciesWithVersions = await getPomDependenciesWithVersions(parsedPom);
    const springBootVersion = await getPomSpringBootVersion(parsedPom);
    if (springBootVersion) {
        console.log('Detected Spring Boot Version', springBootVersion);
        const defaultVersions = await getDefaultSpringBootVersions(springBootVersion);

        if (defaultVersions.length) {
            const mismatchedPackages = [];
            pomDependenciesWithVersions.forEach(pomDependency => defaultVersions.forEach(bootPackage => {
                if (pomDependency.groupId === bootPackage.group && pomDependency.artifactId === bootPackage.name && pomDependency.version !== undefined && pomDependency.version !== bootPackage.version) {
                    const existingMatches = mismatchedPackages.find(mismatchedPackage => mismatchedPackage.group === pomDependency.groupId && mismatchedPackage.name === pomDependency.artifactId && mismatchedPackage.version === pomDependency.version && mismatchedPackage.version === bootPackage.version);
                    if (!existingMatches) {
                        mismatchedPackages.push(new Package(pomDependency.groupId, pomDependency.artifactId, pomDependency.version, bootPackage.version));
                    }
                }
            }));

            console.log('Mismatched Pom Package Count -', mismatchedPackages.length);
            console.log('Mismatched Packages', mismatchedPackages);
        } else {
            console.log('Spring Boot default versions URL no longer exists.');
        }
    }
};

export const retrieveSimilarPomProperties = async (parsedPom) => {
    const pomProperties = await getPomProperties(parsedPom);
    const springBootVersion = await getPomSpringBootVersion(parsedPom);
    if (springBootVersion) {
        console.log('Detected Spring Boot Version', springBootVersion);
        const defaultProperties = await getSpringBootProperties(springBootVersion);

        if (defaultProperties.length) {
            const declaredProperties = [];
            pomProperties.forEach(pomProperty => defaultProperties.forEach(defaultProperty => {
                if (pomProperty === defaultProperty.property) {
                    declaredProperties.push(pomProperty);
                }
            }));

            console.log('Declared Properties Count -', declaredProperties.length);
            console.log('Declared Properties', declaredProperties);
        } else {
            console.log('Spring Boot default versions URL no longer exists.');
        }
    }
};

const getSpringDefaultProperties = async (sbVersion) => {
    try {
        await ensureDirExists();
        if (!existsSync(`${cachePath}/properties_${sbVersion}.json`)) {
            await downloadSpringVersionProperties(sbVersion);
        } else {
            console.log('Spring Boot default versions file already exists in cache.');
        }
    } catch (err) {
        console.error('Error retrieving spring default versions', err);
    }
};

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

// (async () => {
//     console.log('start');
//     const start = Date.now();
//     const parsedPom = await getXMLFromFile(process.argv[2]);
//     await retrieveSimilarPomPackages(parsedPom);
//     await retrieveSimilarPomProperties(parsedPom);
//     console.log(`Process took ${Date.now() - start} ms`);
// })();