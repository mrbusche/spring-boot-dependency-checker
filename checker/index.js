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
    const springBoot = components.filter(component => component.group == 'org.springframework.boot' && component.name == 'spring-boot');
    const springBootVersion = springBoot[0].version;
    console.log('getSpringBootVersion', springBootVersion);
    return springBootVersion;
}

const getDefaultSpringBootComponents = (filename) => {
    const components = getJsonFromFile(filename);
    // console.log('components', JSON.stringify(components));
    return components;
}

const retrieveSimilarPackages = (bomPackages, springBootPackages) => {

}

const components = getComponents('../samples/bom_3.1.9.json');
getSpringBootVersion(components);

const defaultComponents = getDefaultSpringBootComponents('../versions/3.1.9.json')
