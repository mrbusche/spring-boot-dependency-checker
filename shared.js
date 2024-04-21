import { existsSync, mkdirSync, readFileSync } from 'fs';

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