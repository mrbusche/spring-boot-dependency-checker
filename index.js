import { extname } from 'path';
import { retrieveSimilarSbomPackages } from './sbom.js';
import { getXMLFromFile, retrieveSimilarPomPackages, retrieveSimilarPomProperties } from './pom.js';


(async () => {
    const start = Date.now();
    console.log('Calling index.js');
    const filename = process.argv[2];
    const fileExtension = extname(filename);
    console.log('filename', filename, 'fileExtension', fileExtension);
    if (fileExtension === '.json') {
        console.log('Processing json file');
        await retrieveSimilarSbomPackages(filename);
    } else if (fileExtension === '.xml') {
        console.log('Processing xml file');
        const parsedPom = await getXMLFromFile(process.argv[2]);
        await retrieveSimilarPomPackages(parsedPom);
        await retrieveSimilarPomProperties(parsedPom);
    } else {
        console.log('Unknown extenions, unable to process file.');
    }
    console.log(`Process took ${Date.now() - start} ms`);
})();
