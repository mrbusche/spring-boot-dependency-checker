import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { parse } from 'node-html-parser';

export const cachePath = '.cache';

/**
 * Resolves file paths and returns an array of matching file paths.
 * @param {string} filename - The filename or path to resolve
 * @returns {string[]} Array of resolved file paths
 */
export const resolveFilePaths = (filename) => {
  const files = [];

  // Check if filename contains a path (e.g., ../pom.xml, ./pom.xml, /abs/path/pom.xml)
  const isPath = filename.includes(sep) || filename.includes('/');

  if (isPath) {
    // Treat as a specific path - resolve it and read directly
    const resolvedPath = isAbsolute(filename) ? filename : resolve(process.cwd(), filename);
    if (existsSync(resolvedPath)) {
      files.push(resolvedPath);
    }
  } else {
    // Search recursively for files with exact filename match
    for (const file of readdirSync('./', { recursive: true })) {
      try {
        const fullPath = join('./', file);
        // Only add actual files that exactly match the filename
        if (statSync(fullPath).isFile() && basename(file) === filename) {
          files.push(file);
        }
      } catch (_err) {
        // Skip files that can't be accessed (e.g., broken symlinks)
      }
    }
  }

  return files;
};

export const ensureDirExists = async () => {
  if (!existsSync(cachePath)) {
    mkdirSync(cachePath);
  }
};

export const getJsonFromFile = async (filename) => {
  try {
    const data = readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (_err) {
    return [];
  }
};

const getSpringDefaultVersions = async (springBootVersion) => {
  try {
    await ensureDirExists();
    if (!existsSync(`${cachePath}/dependencies_${springBootVersion}.json`)) {
      await downloadSpringDefaultVersions(springBootVersion);
      // } else {
      //     console.log('Spring Boot default versions file already exists in cache.');
    }
  } catch (err) {
    console.error('Error retrieving spring default versions', err);
  }
};

const downloadSpringDefaultVersions = async (springBootVersion) => {
  let url = `https://docs.spring.io/spring-boot/docs/${springBootVersion}/reference/html/dependency-versions.html`;
  let response = await fetch(url);
  // Handle new Spring Boot URL, count redirects as failures, and handle 3.3.+ gradle format
  if (response.status === 404 || response.url.includes('redirect.html')) {
    const springMinorVersion = springBootVersion.replace('.x', '');
    url = `https://docs.spring.io/spring-boot/${springMinorVersion}/appendix/dependency-versions/coordinates.html`;
    response = await fetch(url);
  }
  const versions = [];
  if (response.ok) {
    const template = await response.text();
    const parsedTemplate = parse(template);
    const tableBody = parsedTemplate.querySelector('table.tableblock tbody');

    for (const child of tableBody.childNodes) {
      // there's a header row we should skip
      if (child.childNodes.length !== 0) {
        versions.push({
          group: child.childNodes[1].rawText,
          name: child.childNodes[3].rawText,
          version: child.childNodes[5].rawText,
        });
      }
    }
    writeFileSync(`${cachePath}/dependencies_${springBootVersion}.json`, JSON.stringify(versions, null, 2));
  } else {
    writeFileSync(`${cachePath}/dependencies_${springBootVersion}.json`, JSON.stringify(versions, null, 2));
    console.log('URL not found - Spring Boot default versions URL no longer exists.');
  }
};

export const getDefaultSpringBootVersions = async (filename) => {
  await getSpringDefaultVersions(filename);
  return getJsonFromFile(`${cachePath}/dependencies_${filename}.json`);
};

export class Package {
  constructor(group, name, inputFileVersion, bootVersion) {
    this.group = group;
    this.name = name;
    this.inputFileVersion = inputFileVersion;
    this.bootVersion = bootVersion;
  }
}
