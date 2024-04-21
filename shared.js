import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { parse } from 'node-html-parser';

export const cachePath = '.cache';

export const ensureDirExists = async () => {
    if (!existsSync(cachePath)) {
        mkdirSync(cachePath);
    }
};

export const getJsonFromFile = async (filename) => {
    try {
        const data = readFileSync(filename, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const getSpringDefaultVersions = async (sbVersion) => {
    try {
        await ensureDirExists();
        if (!existsSync(`${cachePath}/dependencies_${sbVersion}.json`)) {
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
            await writeFileSync(`${cachePath}/dependencies_${sbVersion}.json`, JSON.stringify(versions, null, 2));
            break;
        }
        case 404:
            await writeFileSync(`${cachePath}/dependencies_${sbVersion}.json`, JSON.stringify(versions, null, 2));
            console.log('URL not found - Spring Boot default versions URL no longer exists.');
            break;
    }
};

export const getDefaultSpringBootVersions = async (filename) => {
    await getSpringDefaultVersions(filename);
    return getJsonFromFile(`${cachePath}/dependencies_${filename}.json`);
};

export class Package {
    constructor(group, name, sbomVersion, bootVersion) {
        this.group = group;
        this.name = name;
        this.sbomVersion = sbomVersion;
        this.bootVersion = bootVersion;

    }
}