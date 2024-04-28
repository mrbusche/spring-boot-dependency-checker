import g2js from 'gradle-to-js/lib/parser.js';
import { getDefaultSpringBootVersions, Package } from './shared.js';

export const getJSFromFile = async (filename) => {
    try {
        return g2js.parseFile(filename);
    } catch (err) {
        return [];
    }
};

// export const getGradleProperties = async (parsedGradle) => {
//     const properties = parsedGradle.project?.properties;
//     if (properties) {
//         return Object.keys(properties);
//     }
//     return [];
// };
//
// const getSpringBootProperties = async (filename) => {
//     await getSpringDefaultProperties(filename);
//     return getJsonFromFile(`${cachePath}/properties_${filename}.json`);
// };

export const getGradleDependenciesWithVersions = async (parsedGradle) => {
    if (Array.isArray(parsedGradle.dependencies)) {
        return parsedGradle.dependencies.filter(dep => dep.version);
    }
    return [];
};

export const getGradleSpringBootVersion = async (parsedGradle) => {
    const springBootPlugin = parsedGradle?.plugins?.filter(plugin => plugin.id === 'org.springframework.boot');
    if (Array.isArray(springBootPlugin) && springBootPlugin.length) {
        return springBootPlugin[0].version;
    }
    console.log('No Spring Boot version found.');
    return '';
};

export const retrieveSimilarGradlePackages = async (parsedGradle, springBootVersion) => {
    const gradleDependenciesWithVersions = await getGradleDependenciesWithVersions(parsedGradle);
    if (springBootVersion) {
        const defaultVersions = await getDefaultSpringBootVersions(springBootVersion);

        if (defaultVersions.length) {
            const mismatchedPackages = [];
            gradleDependenciesWithVersions.forEach(gradleDependency => defaultVersions.forEach(bootPackage => {
                if (gradleDependency.group === bootPackage.group && gradleDependency.name === bootPackage.name) {
                    const existingMatches = mismatchedPackages.find(mismatchedPackage => mismatchedPackage.group === gradleDependency.group && mismatchedPackage.name === gradleDependency.name);
                    if (!existingMatches) {
                        mismatchedPackages.push(new Package(gradleDependency.group, gradleDependency.name, gradleDependency.version, bootPackage.version));
                    }
                }
            }));

            console.log('Mismatched Gradle Package Count -', mismatchedPackages.length);
            if (mismatchedPackages.length) {
                console.log('Mismatched Gradle Packages -', mismatchedPackages);
            }
        } else {
            console.log('Spring Boot default versions URL no longer exists.');
        }
    }
};

// export const retrieveSimilarGradleProperties = async (parsedGradle, springBootVersion) => {
//     const pomProperties = await getGradleProperties(parsedGradle);
//     if (springBootVersion) {
//         const defaultProperties = await getSpringBootProperties(springBootVersion);
//
//         if (defaultProperties.length) {
//             const declaredProperties = [];
//             pomProperties.forEach(pomProperty => defaultProperties.forEach(defaultProperty => {
//                 if (pomProperty === defaultProperty.property) {
//                     declaredProperties.push(pomProperty);
//                 }
//             }));
//
//             console.log('Declared Gradle Properties Count -', declaredProperties.length);
//             if (declaredProperties.length) {
//                 console.log('Declared Gradle Properties -', declaredProperties);
//             }
//         } else {
//             console.log('Spring Boot default versions URL no longer exists.');
//         }
//     }
// };
//
