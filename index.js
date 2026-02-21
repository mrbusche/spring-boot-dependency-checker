import { extname } from 'node:path';
import { getGradleSpringBootVersion, getJSFromFile, retrieveSimilarGradlePackages } from './gradle.js';
import { getPomSpringBootVersion, getXMLFromFile, retrieveSimilarPomPackages, retrieveSimilarPomProperties } from './pom.js';

export const checkDependencies = async () => {
  const start = Date.now();
  const filename = process.argv[2];
  const fileExtension = extname(filename);

  let result = {
    fileType: 'Unknown',
    springBootVersion: null,
    elapsedMs: 0,
    packages: [],
    properties: [],
    packageLength: 0,
    propertyLength: 0,
  };

  if (fileExtension === '.xml') {
    const parsedPom = await getXMLFromFile(filename);
    const springBootVersion = await getPomSpringBootVersion(parsedPom);
    if (springBootVersion) {
      const declaredPackages = await retrieveSimilarPomPackages(parsedPom, springBootVersion);
      const declaredProperties = await retrieveSimilarPomProperties(parsedPom, springBootVersion);
      result = {
        fileType: 'Maven POM',
        springBootVersion: springBootVersion,
        packages: declaredPackages,
        properties: declaredProperties,
        packageLength: declaredPackages.length,
        propertyLength: declaredProperties.length,
      };
    }
  } else if (fileExtension === '.gradle') {
    const parsedGradle = await getJSFromFile(filename);
    const springBootVersion = await getGradleSpringBootVersion(parsedGradle);
    if (springBootVersion) {
      const declaredPackages = await retrieveSimilarGradlePackages(parsedGradle, springBootVersion);
      result = {
        fileType: 'Gradle',
        springBootVersion: springBootVersion,
        packages: declaredPackages,
        properties: [],
        packageLength: declaredPackages.length,
        propertyLength: 0,
      };
    }
  }

  result.elapsedMs = Date.now() - start;
  return result;
};

// (async () => {
//     await checkDependencies();
// })();
