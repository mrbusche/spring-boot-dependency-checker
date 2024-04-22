import { getDefaultSpringBootVersions, getJsonFromFile, Package } from './shared.js';

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

export const retrieveSimilarSbomPackages = async (bomFile) => {
    const components = await getComponents(bomFile);
    const springBootVersion = await getSpringBootVersion(components);
    if (springBootVersion) {
        console.log('Detected Spring Boot Version -', springBootVersion);
        const defaultVersions = await getDefaultSpringBootVersions(springBootVersion);

        if (defaultVersions.length) {
            const mismatchedPackages = [];
            components.forEach(bomPackage => defaultVersions.forEach(bootPackage => {
                if (bomPackage.group === bootPackage.group && bomPackage.name === bootPackage.name && bomPackage.version !== undefined && bomPackage.version !== bootPackage.version) {
                    const existingMatches = mismatchedPackages.find(mismatchedPackage => mismatchedPackage.group === bomPackage.group && mismatchedPackage.name === bomPackage.name && mismatchedPackage.inputFileVersion === bomPackage.version && mismatchedPackage.bootVersion === bootPackage.version);
                    if (!existingMatches) {
                        mismatchedPackages.push(new Package(bomPackage.group, bomPackage.name, bomPackage.version, bootPackage.version));
                    }
                }
            }));

            console.log('Mismatched Package Count -', mismatchedPackages.length);
            if (mismatchedPackages.length) {
                console.log('Mismatched Packages -', mismatchedPackages);
            }
        } else {
            console.log('Spring Boot default versions URL no longer exists.');
        }
    }
};
