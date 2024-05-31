import g2js from 'gradle-to-js/lib/parser.js';
import { getDefaultSpringBootVersions, Package } from './shared.js';

export const getJSFromFile = async (filename) => {
    try {
        return g2js.parseFile(filename);
    } catch (err) {
        return [];
    }
};

export const getGradleDependenciesWithVersions = async (parsedGradle) => {
    let allDependencies = [];
    // if it's not an array, a single dependency has been declared and it doesn't apply
    if (Array.isArray(parsedGradle.dependencies)) {
        allDependencies = allDependencies.concat(parsedGradle.dependencies.filter(dep => dep.version));
    }
    if (Array.isArray(parsedGradle?.subprojects?.dependencies)) {
        allDependencies = allDependencies.concat(parsedGradle.subprojects.dependencies.filter(dep => dep.version));
    }
    return allDependencies;
};

export const getGradleSpringBootVersion = async (parsedGradle) => {
    const springBootPlugin = parsedGradle?.plugins?.filter(plugin => plugin.id === 'org.springframework.boot');
    if (Array.isArray(springBootPlugin) && springBootPlugin.length && springBootPlugin[0].version) {
        // Handle build.gradle, which allows 3.2.+ format
        return springBootPlugin[0].version.replace('+', 'x');
    }
    // there are likely more places we could search for this variable, but we'll start here
    if (parsedGradle?.buildscript?.ext?.springBootVersion) {
        return String(parsedGradle?.buildscript?.ext?.springBootVersion).replace('+', 'x');
    }
    if (parsedGradle.buildscript?.["ext['springBootVersion']"]) {
        return parsedGradle.buildscript["ext['springBootVersion']"];
    }
    console.log('No Spring Boot version found.');
    return '';
};

export const retrieveSimilarGradlePackages = async (parsedGradle, springBootVersion) => {
    const gradleDependenciesWithVersions = await getGradleDependenciesWithVersions(parsedGradle);
    if (springBootVersion) {
        const defaultVersions = await getDefaultSpringBootVersions(springBootVersion);

        if (defaultVersions.length) {
            const declaredPackages = [];
            gradleDependenciesWithVersions.forEach(gradleDependency => defaultVersions.forEach(bootPackage => {
                if (gradleDependency.group === bootPackage.group && gradleDependency.name === bootPackage.name) {
                    const existingMatches = declaredPackages.find(declaredPackage => declaredPackage.group === gradleDependency.group && declaredPackage.name === gradleDependency.name);
                    if (!existingMatches) {
                        declaredPackages.push(new Package(gradleDependency.group, gradleDependency.name, gradleDependency.version, bootPackage.version));
                    }
                }
            }));

            console.log('Declared Gradle Package Count -', declaredPackages.length);
            if (declaredPackages.length) {
                console.log('Declared Gradle Packages -', declaredPackages);
            }
            return declaredPackages;
        } else {
            console.log('Spring Boot default versions URL no longer exists.');
            return [];
        }
    }
    return [];
};
