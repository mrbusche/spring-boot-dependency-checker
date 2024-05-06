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

export const getPomProperties = async (parsedPom) => {
    const properties = parsedPom.project?.properties;
    if (properties) {
        return Object.keys(properties);
    }
    return [];
};

const getSpringBootProperties = async (filename) => {
    await getSpringDefaultProperties(filename);
    return getJsonFromFile(`${cachePath}/properties_${filename}.json`);
};

export const getPomDependenciesWithVersions = async (parsedPom) => {
    // if it's not an array, a single dependency has been declared and it doesn't apply
    if (Array.isArray(parsedPom?.project?.dependencies?.dependency)) {
        return parsedPom.project.dependencies.dependency.filter(dep => dep.version);
    }
    return [];
};

export const getPomSpringBootVersion = async (parsedPom) => {
    if (parsedPom.project?.parent?.groupId === 'org.springframework.boot' && parsedPom.project?.parent?.artifactId === 'spring-boot-starter-parent') {
        return parsedPom.project.parent.version;
    }
    if (parsedPom.project?.dependencyManagement?.dependencies?.dependency?.groupId === 'org.springframework.boot' && parsedPom.project?.dependencyManagement?.dependencies?.dependency?.artifactId === 'spring-boot-dependencies') {
        return parsedPom.project.dependencyManagement.dependencies.dependency.version;
    }
    console.log('No Spring Boot version found.');
    return '';
};

export const retrieveSimilarPomPackages = async (parsedPom, springBootVersion) => {
    const pomDependenciesWithVersions = await getPomDependenciesWithVersions(parsedPom);
    if (springBootVersion) {
        const defaultVersions = await getDefaultSpringBootVersions(springBootVersion);

        if (defaultVersions.length) {
            const mismatchedPackages = [];
            pomDependenciesWithVersions.forEach(pomDependency => defaultVersions.forEach(bootPackage => {
                if (pomDependency.groupId === bootPackage.group && pomDependency.artifactId === bootPackage.name) {
                    const existingMatches = mismatchedPackages.find(mismatchedPackage => mismatchedPackage.group === pomDependency.groupId && mismatchedPackage.name === pomDependency.artifactId);
                    if (!existingMatches) {
                        mismatchedPackages.push(new Package(pomDependency.groupId, pomDependency.artifactId, pomDependency.version, bootPackage.version));
                    }
                }
            }));

            console.log('Mismatched Pom Package Count -', mismatchedPackages.length);
            if (mismatchedPackages.length) {
                console.log('Mismatched Pom Packages -', mismatchedPackages);
            }
        } else {
            console.log('Spring Boot default versions URL no longer exists.');
        }
    }
};

export const retrieveSimilarPomProperties = async (parsedPom, springBootVersion) => {
    const pomProperties = await getPomProperties(parsedPom);
    if (springBootVersion) {
        const defaultProperties = await getSpringBootProperties(springBootVersion);

        if (defaultProperties.length) {
            const declaredProperties = [];
            pomProperties.forEach(pomProperty => defaultProperties.forEach(defaultProperty => {
                if (pomProperty === defaultProperty.property) {
                    declaredProperties.push(pomProperty);
                }
            }));

            console.log('Declared Pom Properties Count -', declaredProperties.length);
            if (declaredProperties.length) {
                console.log('Declared Pom Properties -', declaredProperties);
            }
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
            // } else {
            //     console.log('Spring Boot default properties file already exists in cache.');
        }
    } catch (err) {
        console.error('Error retrieving spring default properties', err);
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

            // older versions of Spring Boot do not have property versions listed
            if (tableBody) {
                tableBody.childNodes.forEach(child => // there's a header row we should skip
                    child.childNodes.length === 0 ? '' : versions.push({
                        property: child.childNodes[3].rawText,
                    }));
            }
            await writeFileSync(`${cachePath}/properties_${sbVersion}.json`, JSON.stringify(versions, null, 2));
            break;
        }
        case 404:
            await writeFileSync(`${cachePath}/properties_${sbVersion}.json`, JSON.stringify(versions, null, 2));
            console.log('URL not found - Spring Boot default versions URL no longer exists.');
            break;
    }
};
