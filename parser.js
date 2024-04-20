import { XMLParser } from 'fast-xml-parser';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'node-html-parser';
import { ensureDirExists, getDefaultSpringBootVersions, getJsonFromFile, Package } from './index.js';

const cachePath = '.cache';

const getXMLFromFile = async (filename) => {
    try {
        const parser = new XMLParser();
        const xmlData = readFileSync('pom.xml', 'utf8');
        return parser.parse(xmlData);
    } catch (err) {
        return [];
    }
};

export const getProperties = async (parsedPom) => {
    return parsedPom.project.properties;
};

const getSpringBootProperties = async (filename) => {
    await getSpringDefaultProperties(filename);
    return getJsonFromFile(`${cachePath}/properties_${filename}.json`);
};

export const getDependenciesWithVersions = async (parsedPom) => {
    return parsedPom.project.dependencies.dependency.filter(dep => dep.version);
};

const getPomSpringBootVersion = async (parsedPom) => {
    if (parsedPom.project.parent.groupId === 'org.springframework.boot' && parsedPom.project.parent.artifactId == 'spring-boot-starter-parent') {
        return parsedPom.project.parent.version;
    }
    console.log('No Spring Boot version found.');
    return '';
};

export const retrieveSimilarPomPackages = async (parsedPom) => {
    const pomDependenciesWithVersions = await getDependenciesWithVersions(parsedPom);
    const springBootVersion = await getPomSpringBootVersion(parsedPom);
    if (springBootVersion) {
        console.log('Detected Spring Boot Version', springBootVersion);
        const defaultVersions = await getDefaultSpringBootVersions(springBootVersion);

        if (defaultVersions.length) {
            const mismatchedPackages = [];
            pomDependenciesWithVersions.forEach(pomDependency => defaultVersions.forEach(bootPackage => {
                if (pomDependency.groupId === bootPackage.group && pomDependency.artifactId === bootPackage.name && pomDependency.version !== undefined && pomDependency.version !== bootPackage.version) {
                    const existingMatches = mismatchedPackages.find(mismatchedPackage => mismatchedPackage.group === pomDependency.group && mismatchedPackage.name === pomDependency.name && mismatchedPackage.sbomVersion === pomDependency.version && mismatchedPackage.bootVersion === bootPackage.version);
                    if (!existingMatches) {
                        mismatchedPackages.push(new Package(pomDependency.group, pomDependency.name, pomDependency.version, bootPackage.version));
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

(async () => {
    const start = Date.now();

    const parsedPom = await getXMLFromFile('pom.xml');
    // const springBootVersion = await getPomSpringBootVersion(parsedPom);
    // const pomProperties = await getProperties(parsedPom);
    // const pomDependenciesWithVersions = await getDependenciesWithVersions(parsedPom);
    // const defaultSpringBootVersions = await getDefaultSpringBootVersions(springBootVersion);
    // const defaultSpringBootProperties = await getSpringBootProperties(springBootVersion);
    // console.log('springBootVersion', springBootVersion);
    // console.log('pomProperties', pomProperties);
    // console.log('pomDependenciesWithVersions', pomDependenciesWithVersions);
    // console.log('defaultSpringBootVersions', defaultSpringBootVersions);
    // console.log('defaultSpringBootProperties', defaultSpringBootProperties);

    // await downloadSpringVersionProperties(springBootVersion);
    await retrieveSimilarPomPackages(parsedPom);
    // await downloadSpringVersionProperties(process.argv[2]);
    console.log(`Process took ${Date.now() - start} ms`);
})();