import parse from 'node-html-parser';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const cachePath = '.cache';

const getJsonFromFile = async (filename) => {
    const data = readFileSync(filename, 'utf8');
    return JSON.parse(data);
};

const getComponents = async (filename) => {
    const parsedData = await getJsonFromFile(filename);
    return parsedData.components;
};

export const getSpringBootVersion = async (components) => {
    let springBoot = components.filter(component => component.group === 'org.springframework.boot' && component.name === 'spring-boot');
    if (springBoot.length === 0) {
        springBoot = components.filter(component => component.name === 'spring-boot');
    }
    if (springBoot.length === 0) {
        throw new Error('no spring boot version found');
    }
    return springBoot[0].version;
};

const getDefaultSpringBootComponents = async (filename) => {
    await getSpringDefaultVersions(filename);
    return getJsonFromFile(`${cachePath}/${filename}.json`);
};

const retrieveSimilarPackages = async (bomFile) => {
    const components = await getComponents(bomFile);
    const springBootVersion = await getSpringBootVersion(components);
    console.log('springBootVersion', springBootVersion);
    const defaultComponents = await getDefaultSpringBootComponents(springBootVersion);

    const mismatchedPackages = [];
    components.forEach(bomPackage => defaultComponents.forEach(bootPackage => {
        if (bomPackage.group === bootPackage.group && bomPackage.name === bootPackage.name && bomPackage.version !== undefined && bomPackage.version !== bootPackage.version) {
            mismatchedPackages.push({
                group: bomPackage.group,
                name: bomPackage.name,
                bomVersion: bomPackage.version,
                bootVersion: bootPackage.version,
            });
        }
    }));
    console.log('mismatchedPackages', mismatchedPackages);

    console.log('components size', components.length);
    console.log('defaultComponents size', defaultComponents.length);
    console.log('matchingPackages size', mismatchedPackages.length);
};

const getSpringDefaultVersions = async (sbVersion) => {
    try {
        await ensureDirExists();
        if (!existsSync(`${cachePath}/${sbVersion}.json`)) {
            await downloadSpringDefaultVersions(sbVersion);
        } else {
            console.log('file already exists');
        }
    } catch (err) {
        console.error('error retrieving spring default versions', err);
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
            console.log(versions.length);
            await writeFileSync(`${cachePath}/${sbVersion}.json`, JSON.stringify(versions, null, 2));
            break;
        }
        // status "Not Found"
        case 404:
            console.log('Not Found');
            break;
    }
};

const ensureDirExists = async () => {
    if (!existsSync(cachePath)) {
        mkdirSync(cachePath);
    }
};

(async () => {
    const start = Date.now();
    await retrieveSimilarPackages(process.argv[2]);
    console.log(`Process took ${Date.now() - start} ms`);
})();
