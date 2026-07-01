import g2js from 'gradle-to-js/lib/parser.js';

import { getDefaultSpringBootVersions, Package, resolveFilePaths } from './shared.js';

export const getJSFromFile = async (filename) => {
  try {
    const files = resolveFilePaths(filename);
    const parsedGradleFiles = await Promise.all(files.map((file) => g2js.parseFile(file)));

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
  } catch {
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
  return '';
};

export const retrieveSimilarGradlePackages = async (parsedGradle, springBootVersion) => {
  const gradleDependenciesWithVersions = await getGradleDependenciesWithVersions(parsedGradle);
  if (springBootVersion) {
    const requestedCoordinates = gradleDependenciesWithVersions.map(
      (gradleDependency) => `${gradleDependency.group}:${gradleDependency.name}`,
    );
    const defaultVersions = await getDefaultSpringBootVersions(springBootVersion, requestedCoordinates);

    if (defaultVersions.length) {
      const bootVersionMap = new Map();
      for (const bootPackage of defaultVersions) {
        bootVersionMap.set(`${bootPackage.group}:${bootPackage.name}`, bootPackage.version);
      }

      const declaredPackages = [];
      const seenPackages = new Set();
      for (const gradleDependency of gradleDependenciesWithVersions) {
        const key = `${gradleDependency.group}:${gradleDependency.name}`;
        if (seenPackages.has(key)) {
          continue;
        }

        const bootVersion = bootVersionMap.get(key);
        if (bootVersion) {
          declaredPackages.push(new Package(gradleDependency.group, gradleDependency.name, gradleDependency.version, bootVersion));
          seenPackages.add(key);
        }
      }

      return declaredPackages;
    }
  }
  return [];
};
