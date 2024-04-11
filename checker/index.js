const {parse} = require('node-html-parser');
const {existsSync, readFileSync, writeFileSync} = require('fs');
const path = '.cache';

const getJsonFromFile = async (filename) => {
    const data = readFileSync(filename, 'utf8');
    return JSON.parse(data);
}

const getComponents = async (filename) => {
    const parsedData = await getJsonFromFile(filename)
    return parsedData.components;
}

const getSpringBootVersion = async (components) => {
    const springBoot = components.filter(component => component.group === 'org.springframework.boot' && component.name === 'spring-boot');
    return springBoot[0].version;
}

const getDefaultSpringBootComponents = async (filename) => {
    await getSpringDefaultVersions(filename)
    return getJsonFromFile(`${path}/${filename}.json`);
}

const retrieveSimilarPackages = async (bomFile) => {
    const components = await getComponents(bomFile);
    const springBootVersion = await getSpringBootVersion(components);
    console.log('springBootVersion', springBootVersion);
    const defaultComponents = await getDefaultSpringBootComponents(springBootVersion);

    const mismatchedPackages = [];
    components.forEach(bomPackage =>
        defaultComponents.forEach(bootPackage => {
                if (bomPackage.group === bootPackage.group &&
                    bomPackage.name === bootPackage.name &&
                    bomPackage.version !== bootPackage.version) {
                    mismatchedPackages.push({
                        group: bomPackage.group,
                        name: bomPackage.name,
                        bomVersion: bomPackage.version,
                        bookVersion: bootPackage.version
                    })
                }
            }
        )
    )
    console.log(mismatchedPackages);

    // bom_3.1.9.json line 1139 overwritten
    console.log('components size', components.length);
    console.log('defaultComponents size', defaultComponents.length);
    console.log('matchingPackages size', mismatchedPackages.length);
}

const getSpringDefaultVersions = async (sbVersion) => {
    try {
        if (!existsSync(`${path}/${sbVersion}.json`)) {
            await downloadSpringDefaultVersions(sbVersion);
        } else {
            console.log('file already exists');
        }
    } catch (err) {
        console.log('err', err)
    }
}

const downloadSpringDefaultVersions = async (sbVersion) => {
    const response = await fetch(`https://docs.spring.io/spring-boot/docs/${sbVersion}/reference/html/dependency-versions.html`);
    const versions = [];
    switch (response.status) {
        // status "OK"
        case 200: {
            const template = await response.text();
            const parsedTemplate = parse(template)
            const tableBody = parsedTemplate.querySelector('table tbody');

            tableBody.childNodes.forEach(child =>
                // there's a header row we should skip
                child.childNodes.length === 0 ? '' :
                    versions.push({
                        group: child.childNodes[1].rawText,
                        name: child.childNodes[3].rawText,
                        version: child.childNodes[5].rawText,
                    })
            )
            console.log(versions.length);
            await writeFileSync(`${path}/${sbVersion}.json`, JSON.stringify(versions, null, 2));
            break;
        }
        // status "Not Found"
        case 404:
            console.log('Not Found');
            break;
    }
}

(async () => {
    const start = Date.now()
    await retrieveSimilarPackages('../samples/bom_3.1.9.json');
    console.log(`Process took ${Date.now() - start} ms`);
})();
