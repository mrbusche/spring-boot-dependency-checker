import { extname } from 'path';
import { retrieveSimilarSbomPackages } from './sbom.js';
import {
    getPomSpringBootVersion,
    getXMLFromFile,
    retrieveSimilarPomPackages,
    retrieveSimilarPomProperties,
} from './pom.js';
import { getGradleSpringBootVersion, getJSFromFile, retrieveSimilarGradlePackages } from './gradle.js';

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
        const parsedPom = await getXMLFromFile(filename);
        const springBootVersion = await getPomSpringBootVersion(parsedPom);
        if (springBootVersion) {
            console.log('Detected Spring Boot Version -', springBootVersion);
            await retrieveSimilarPomPackages(parsedPom, springBootVersion);
            await retrieveSimilarPomProperties(parsedPom, springBootVersion);
        }
    } else if (fileExtension === '.gradle') {
        console.log('Processing gradle file');
        const parsedGradle = await getJSFromFile(filename);
        const springBootVersion = await getGradleSpringBootVersion(parsedGradle);
        if (springBootVersion) {
            console.log('Detected Spring Boot Version -', springBootVersion);
            await retrieveSimilarGradlePackages(parsedGradle, springBootVersion);
            //     await retrieveSimilarPomProperties(parsedPom, springBootVersion);
        }
    } else {
        console.log('Unknown extension, unable to process file.');
    }
    console.log(`Process took ${Date.now() - start} ms`);
};

// (async () => {
//     await checkDependencies();
// })();
