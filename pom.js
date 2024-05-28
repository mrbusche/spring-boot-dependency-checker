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
    let allDependencies = [];
    // if it's not an array, a single dependency has been declared and it doesn't apply
    if (Array.isArray(parsedPom?.project?.dependencies?.dependency)) {
        allDependencies = allDependencies.concat(parsedPom.project.dependencies.dependency.filter(dep => dep.version));
    }
    if (Array.isArray(parsedPom?.project?.dependencyManagement?.dependencies?.dependency)) {
        allDependencies = allDependencies.concat(parsedPom.project.dependencyManagement.dependencies.dependency.filter(dep => dep.version));
    }
    return allDependencies;
};

export const getPomSpringBootVersion = async (parsedPom) => {
    if (parsedPom.project?.parent?.groupId === 'org.springframework.boot' && parsedPom.project?.parent?.artifactId === 'spring-boot-starter-parent') {
        return parsedPom.project.parent.version;
    }
    if (parsedPom.project?.dependencyManagement?.dependencies?.dependency?.groupId === 'org.springframework.boot' && parsedPom.project?.dependencyManagement?.dependencies?.dependency?.artifactId === 'spring-boot-dependencies') {
        const bootVersion = parsedPom.project.dependencyManagement.dependencies.dependency.version;
        return replaceVariable(parsedPom.project.properties, bootVersion);
    }
    console.log('No Spring Boot version found.');
    return '';
};

export const retrieveSimilarPomPackages = async (parsedPom, springBootVersion) => {
    const pomDependenciesWithVersions = await getPomDependenciesWithVersions(parsedPom);
    if (springBootVersion) {
        const defaultVersions = await getDefaultSpringBootVersions(springBootVersion);

        if (defaultVersions.length) {
            const declaredPackages = [];
            pomDependenciesWithVersions.forEach(pomDependency => defaultVersions.forEach(bootPackage => {
                if (pomDependency.groupId === bootPackage.group && pomDependency.artifactId === bootPackage.name) {
                    const pomVersion = replaceVariable(parsedPom.project.properties, pomDependency.version);
                    const existingMatches = declaredPackages.find(declaredPackage => declaredPackage.group === pomDependency.groupId && declaredPackage.name === pomDependency.artifactId);
                    if (!existingMatches) {
                        declaredPackages.push(new Package(pomDependency.groupId, pomDependency.artifactId, pomVersion, bootPackage.version));
                    }
                }
            }));

            console.log('Declared Pom Package Count -', declaredPackages.length);
            if (declaredPackages.length) {
                console.log('Declared Pom Packages -', declaredPackages);
            }
            return declaredPackages;
        } else {
            console.log('Spring Boot default versions URL no longer exists.');
            return [];
        }
    }
    return [];
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
            return declaredProperties;
        } else {
            console.log('Spring Boot default versions URL no longer exists.');
            return [];
        }
    }
    return [];
};

const getSpringDefaultProperties = async (springBootVersion) => {
    try {
        await ensureDirExists();
        if (!existsSync(`${cachePath}/properties_${springBootVersion}.json`)) {
            await downloadSpringVersionProperties(springBootVersion);
            // } else {
            //     console.log('Spring Boot default properties file already exists in cache.');
        }
    } catch (err) {
        console.error('Error retrieving spring default properties', err);
    }
};

const replaceVariable = (properties, version) => {
    if (String(version).startsWith('${')) {
        const variableName = version.replace('${', '').replace('}', '');
        return properties[variableName];
    }
    return version;
};

const downloadSpringVersionProperties = async (springBootVersion) => {
    let url = `https://docs.spring.io/spring-boot/docs/${springBootVersion}/reference/html/dependency-versions.html`;
    let bodyIndex = 1;
    let response = await fetch(url);
    // Handle new Spring Boot URL, count redirects as failures, and handle 3.3.+ gradle format
    if (response.status === 404 || response.url.includes('redirect.html')) {
        const springMinorVersion = springBootVersion.replace('.x', '');
        url = `https://docs.spring.io/spring-boot/${springMinorVersion}/appendix/dependency-versions/properties.html`;
        bodyIndex = 0;
        response = await fetch(url);
    }
    const versions = [];
    if (response.ok) {
        const template = await response.text();
        const parsedTemplate = parse(template);
        const tableBody = parsedTemplate.getElementsByTagName('tbody')[bodyIndex];

        // older versions of Spring Boot do not have property versions listed
        if (tableBody) {
            tableBody.childNodes.forEach(child => // there's a header row we should skip
                child.childNodes.length === 0 ? '' : versions.push({
                    property: child.childNodes[3].rawText,
                }));
        }
        await writeFileSync(`${cachePath}/properties_${springBootVersion}.json`, JSON.stringify(versions, null, 2));
    } else {
        await writeFileSync(`${cachePath}/properties_${springBootVersion}.json`, JSON.stringify(versions, null, 2));
        console.log('URL not found - Spring Boot default versions URL no longer exists.');
    }
};
