import { parse } from 'node-html-parser';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const cachePath = '.cache';

export const getJsonFromFile = async (filename) => {
    try {
        const data = readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

export const getComponents = async (filename) => {
    const parsedData = await getJsonFromFile(filename);
    return parsedData.components;
};

export const getSpringBootVersion = async (components) => {
    let springBoot = components.find(component => component.group === 'org.springframework.boot' && component.name === 'spring-boot');
    if (springBoot === undefined) {
        springBoot = components.find(component => component.name === 'spring-boot');
        if (springBoot === undefined) {
            console.log('No Spring Boot version found');
            return '';
        }
    }
    return springBoot.version;
};

const getDefaultSpringBootComponents = async (filename) => {
    await getSpringDefaultVersions(filename);
    return getJsonFromFile(`${cachePath}/${filename}.json`);
};

export const retrieveSimilarPackages = async (bomFile) => {
    const components = await getComponents(bomFile);
    const springBootVersion = await getSpringBootVersion(components);
    if (springBootVersion) {
        console.log('Detected Spring Boot Version', springBootVersion);
        const defaultComponents = await getDefaultSpringBootComponents(springBootVersion);

        if (defaultComponents.length) {
            const mismatchedPackages = [];
            components.forEach(bomPackage => defaultComponents.forEach(bootPackage => {
                if (bomPackage.group === bootPackage.group && bomPackage.name === bootPackage.name && bomPackage.version !== undefined && bomPackage.version !== bootPackage.version) {
                    const existingMatches = mismatchedPackages.find(mismatchedPackage => mismatchedPackage.group === bomPackage.group && mismatchedPackage.name === bomPackage.name && mismatchedPackage.sbomVersion === bomPackage.version && mismatchedPackage.bootVersion === bootPackage.version);
                    if (!existingMatches) {
                        mismatchedPackages.push(new Package(bomPackage.group, bomPackage.name, bomPackage.version, bootPackage.version));
                    }
                }
            }));

            console.log('Mismatched Package Count -', mismatchedPackages.length);
            console.log('Mismatched Packages', mismatchedPackages);
        } else {
            console.log('Spring Boot default versions URL no longer exists.');
        }
    }
};

const getSpringDefaultVersions = async (sbVersion) => {
    try {
        await ensureDirExists();
        if (!existsSync(`${cachePath}/${sbVersion}.json`)) {
            await downloadSpringDefaultVersions(sbVersion);
        } else {
            console.log('Spring Boot default versions file already exists in cache.');
        }
    } catch (err) {
        console.error('Error retrieving spring default versions', err);
    }
};

const downloadSpringDefaultVersions = async (sbVersion) => {
    const response = await fetch(`https://docs.spring.io/spring-boot/docs/${sbVersion}/reference/html/dependency-versions.html`);
    const versions = [];
    switch (response.status) {
        // status "OK"
        case 200: {
            const template = await response.text();
            const parsedTemplate = parse(template);
            const tableBody = parsedTemplate.querySelector('table tbody');

            tableBody.childNodes.forEach(child => // there's a header row we should skip
                child.childNodes.length === 0 ? '' : versions.push({
                    group: child.childNodes[1].rawText,
                    name: child.childNodes[3].rawText,
                    version: child.childNodes[5].rawText,
                }));
            await writeFileSync(`${cachePath}/${sbVersion}.json`, JSON.stringify(versions, null, 2));
            break;
        }
        case 404:
            await writeFileSync(`${cachePath}/${sbVersion}.json`, JSON.stringify(versions, null, 2));
            console.log('URL not found - Spring Boot default versions URL no longer exists.');
            break;
    }
};

const ensureDirExists = async () => {
    if (!existsSync(cachePath)) {
        mkdirSync(cachePath);
    }
};

class Package {
    constructor(group, name, sbomVersion, bootVersion) {
        this.group = group;
        this.name = name;
        this.sbomVersion = sbomVersion;
        this.bootVersion = bootVersion;

    }
}

// (async () => {
//     const start = Date.now();
//     await retrieveSimilarPackages(process.argv[2]);
//     console.log(`Process took ${Date.now() - start} ms`);
// })();
