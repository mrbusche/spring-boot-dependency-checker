const { readFileSync } = require('fs');

const getJsonFromFile = (filename) => {
    const data = readFileSync(filename, 'utf8');
    return JSON.parse(data);
}

const getComponents = (filename) => {
    const parsedData = getJsonFromFile(filename)
    return parsedData.components;
}

const getSpringBootVersion = (components) => {
    const springBoot = components.filter(component => component.group === 'org.springframework.boot' && component.name === 'spring-boot');
    const springBootVersion = springBoot[0].version;
    // console.log('getSpringBootVersion', springBootVersion);
    return springBootVersion;
}

const getDefaultSpringBootComponents = (filename) => {
    const components = getJsonFromFile(filename);
    // console.log('components', JSON.stringify(components));
    return components;
}

const retrieveSimilarPackages = (bomFile) => {
    const components = getComponents(bomFile);
    const springBootVersion = getSpringBootVersion(components);
    console.log('springBootVersion', springBootVersion);
    const defaultComponents = getDefaultSpringBootComponents(`../versions/${springBootVersion}.json`)

    const matchingPackages = components.filter(bomPackage =>
        defaultComponents.some(bootPackage =>
            bomPackage.group === bootPackage.group &&
            bomPackage.name === bootPackage.name &&
            bomPackage.version !== bootPackage.version
        )
    )

    // bom_3.1.9.json line 1139 overwritten
    console.log('matchingPackages', matchingPackages);
    console.log('components size', components.length);
    console.log('defaultComponents size', defaultComponents.length);
    console.log('matchingPackages size', matchingPackages.length);
}

retrieveSimilarPackages('../samples/bom_3.1.9.json');
