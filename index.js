import { extname } from 'path';
import { retrieveSimilarSbomPackages } from './sbom.js';
import {
    getPomSpringBootVersion,
    getXMLFromFile,
    retrieveSimilarPomPackages,
    retrieveSimilarPomProperties,
} from './pom.js';

export const checkDependencies = async () => {
    const start = Date.now();
    const filename = process.argv[2];
    const fileExtension = extname(filename);
    // console.log('filename', filename, 'fileExtension', fileExtension);
    if (fileExtension === '.json') {
        console.log('Processing json file');
        await retrieveSimilarSbomPackages(filename);
    } else if (fileExtension === '.xml') {
        console.log('Processing xml file');
        const parsedPom = await getXMLFromFile(process.argv[2]);
        const springBootVersion = await getPomSpringBootVersion(parsedPom);
        if (springBootVersion) {
            console.log('Detected Spring Boot Version -', springBootVersion);
            await retrieveSimilarPomPackages(parsedPom, springBootVersion);
            await retrieveSimilarPomProperties(parsedPom, springBootVersion);
        }
    } else {
        console.log('Unknown extension, unable to process file.');
    }
    console.log(`Process took ${Date.now() - start} ms`);
};

// (async () => {
//     await checkDependencies();
// })();
