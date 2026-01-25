import g2js from 'gradle-to-js/lib/parser.js';
import { getDefaultSpringBootVersions, Package, resolveFilePaths } from './shared.js';

export const getJSFromFile = async (filename) => {
  try {
    const parsedGradleFiles = [];
    const files = resolveFilePaths(filename);

    for (const file of files) {
      parsedGradleFiles.push(await g2js.parseFile(file));
    }

    let dependencies = [];
    let subprojects = [];
    let plugins = [];
    let buildscript = [];
    let x = [];
    let allprojects = [];
    for (const f of parsedGradleFiles) {
      dependencies = dependencies.concat(f.dependencies ?? []);
      subprojects = subprojects.concat(f.subprojects ?? []);
      plugins = plugins.concat(f.plugins ?? []);
      buildscript = buildscript.concat(f.buildscript ?? []);
      x = x.concat(f.x ?? []);
      allprojects = allprojects.concat(f.allprojects ?? []);
    }

    return {
      dependencies: dependencies,
      subprojects: subprojects,
      plugins: plugins,
      buildscript: buildscript,
      x: x,
      allprojects: allprojects,
    };
  } catch (_err) {
    return [];
  }
};

export const getGradleDependenciesWithVersions = async (parsedGradle) => {
  let allDependencies = [];
  // if it's not an array, a single dependency has been declared and it doesn't apply
  if (Array.isArray(parsedGradle.dependencies)) {
    allDependencies = allDependencies.concat(parsedGradle.dependencies.filter((dep) => dep.version));
  }
  if (Array.isArray(parsedGradle?.subprojects?.[0]?.dependencies)) {
    allDependencies = allDependencies.concat(parsedGradle.subprojects[0].dependencies.filter((dep) => dep.version));
  }
  return allDependencies;
};

export const getGradleSpringBootVersion = async (parsedGradle) => {
  const springBootPlugin = parsedGradle?.plugins?.filter((plugin) => plugin.id === 'org.springframework.boot');
  if (Array.isArray(springBootPlugin) && springBootPlugin.length && springBootPlugin[0].version) {
    // Handle build.gradle, which allows 3.2.+ format
    return springBootPlugin[0].version.replace('+', 'x');
  }
  // there are likely more places we could search for this variable, but we'll start here
  if (parsedGradle?.buildscript?.[0]?.ext?.springBootVersion) {
    return String(parsedGradle?.buildscript?.[0]?.ext?.springBootVersion).replace('+', 'x');
  }
  if (parsedGradle.buildscript?.[0]?.["ext['springBootVersion']"]) {
    return parsedGradle.buildscript[0]["ext['springBootVersion']"];
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
      for (const gradleDependency of gradleDependenciesWithVersions) {
        for (const bootPackage of defaultVersions) {
          if (gradleDependency.group === bootPackage.group && gradleDependency.name === bootPackage.name) {
            const existingMatches = declaredPackages.find(
              (declaredPackage) => declaredPackage.group === gradleDependency.group && declaredPackage.name === gradleDependency.name,
            );
            if (!existingMatches) {
              declaredPackages.push(
                new Package(gradleDependency.group, gradleDependency.name, gradleDependency.version, bootPackage.version),
              );
              break;
            }
          }
        }
      }

      console.log('Declared Gradle Package Count -', declaredPackages.length);
      if (declaredPackages.length) {
        console.log('Declared Gradle Packages -', declaredPackages);
      }
      return declaredPackages;
    }
  }
  console.log('Spring Boot default versions URL no longer exists.');
  return [];
};
