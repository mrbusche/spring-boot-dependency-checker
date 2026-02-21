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
      } catch {
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
  } catch {
    return [];
  }
};

const getSpringDefaultVersions = async (springBootVersion) => {
  try {
    await ensureDirExists();
    if (!existsSync(`${cachePath}/dependencies_${springBootVersion}.json`)) {
      await downloadSpringDefaultVersions(springBootVersion);
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
    console.warn('URL not found - Spring Boot default versions URL no longer exists.');
  }
};

export const getDefaultSpringBootVersions = async (filename) => {
  await getSpringDefaultVersions(filename);
  return getJsonFromFile(`${cachePath}/dependencies_${filename}.json`);
};

const normalizeQualifier = (value) => {
  const normalized = String(value).toLowerCase();
  if (['ga', 'final', 'release'].includes(normalized)) {
    return '';
  }
  return normalized;
};

const qualifierRank = (value) => {
  const qualifier = normalizeQualifier(value);
  if (qualifier === 'snapshot') {
    return 0;
  }
  if (['alpha', 'a'].includes(qualifier)) {
    return 1;
  }
  if (['beta', 'b'].includes(qualifier)) {
    return 2;
  }
  if (['milestone', 'm'].includes(qualifier)) {
    return 3;
  }
  if (['rc', 'cr'].includes(qualifier)) {
    return 4;
  }
  if (qualifier === '') {
    return 5;
  }
  if (qualifier === 'sp') {
    return 6;
  }
  return 7;
};

const splitVersionParts = (version) =>
  String(version)
    .trim()
    .replace(/\+/g, '')
    .replace(/\.x$/i, '')
    .split(/[._-]+/)
    .filter((part) => part !== '');

const comparePart = (left, right) => {
  const leftIsNumber = /^\d+$/.test(left);
  const rightIsNumber = /^\d+$/.test(right);

  if (leftIsNumber && rightIsNumber) {
    const leftNumber = Number.parseInt(left, 10);
    const rightNumber = Number.parseInt(right, 10);
    if (leftNumber < rightNumber) {
      return -1;
    }
    if (leftNumber > rightNumber) {
      return 1;
    }
    return 0;
  }

  if (leftIsNumber && !rightIsNumber) {
    return 1;
  }

  if (!leftIsNumber && rightIsNumber) {
    return -1;
  }

  const leftRank = qualifierRank(left);
  const rightRank = qualifierRank(right);
  if (leftRank < rightRank) {
    return -1;
  }
  if (leftRank > rightRank) {
    return 1;
  }
  return normalizeQualifier(left).localeCompare(normalizeQualifier(right));
};

export const compareDependencyVersion = (inputFileVersion, bootVersion) => {
  const leftParts = splitVersionParts(inputFileVersion);
  const rightParts = splitVersionParts(bootVersion);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index++) {
    const leftPart = leftParts[index] ?? '0';
    const rightPart = rightParts[index] ?? '0';
    const comparison = comparePart(leftPart, rightPart);
    if (comparison < 0) {
      return 'older';
    }
    if (comparison > 0) {
      return 'newer';
    }
  }

  return 'same';
};

export class Package {
  constructor(group, name, inputFileVersion, bootVersion) {
    this.group = group;
    this.name = name;
    this.inputFileVersion = inputFileVersion;
    this.bootVersion = bootVersion;
    this.versionComparison = compareDependencyVersion(inputFileVersion, bootVersion);
  }
}
