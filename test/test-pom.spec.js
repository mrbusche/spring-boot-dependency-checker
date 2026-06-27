import { existsSync, unlinkSync, writeFileSync } from 'node:fs';

import { afterAll, describe, expect, it } from 'vitest';

import {
  getPomDependenciesWithVersions,
  getPomProperties,
  getPomSpringBootVersion,
  getXMLFromFile,
  retrieveSimilarPomPackages,
} from '../pom.js';

describe('test pom parsing', () => {
  const filename = 'pom.xml';

  it('should read a properly formatted XML file', async () => {
    const testFile = `<project>
            <parent>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-parent</artifactId>
                <version>3.1.0</version>
            </parent>
            <properties>
                <java.version>1.8</java.version>
                <jackson.version>2.10.2</jackson.version>
            </properties>
            <dependencies>
                <dependency>
                    <groupId>org.apache.httpcomponents</groupId>
                    <artifactId>httpclient</artifactId>
                </dependency>
                <dependency>
                    <groupId>org.java-websocket</groupId>
                    <artifactId>Java-WebSocket</artifactId>
                    <version>2.3.1</version>
                </dependency>
            </dependencies>
        </project>`;
    writeFileSync(filename, testFile);

    const xmlData = await getXMLFromFile(filename);

    expect(xmlData.project.parent[0].artifactId).toBe('spring-boot-starter-parent');
    expect(xmlData.project.parent[0].groupId).toBe('org.springframework.boot');
    expect(xmlData.project.parent[0].version).toBe('3.1.0');

    expect(xmlData.project.properties[0]['java.version']).toBe(1.8);
    expect(xmlData.project.properties[0]['jackson.version']).toBe('2.10.2');

    expect(xmlData.project.dependencies[0].dependency.length).toBe(2);
    expect(xmlData.project.dependencies[0].dependency[0].groupId).toBe('org.apache.httpcomponents');
    expect(xmlData.project.dependencies[0].dependency[0].artifactId).toBe('httpclient');
    expect(xmlData.project.dependencies[0].dependency[1].groupId).toBe('org.java-websocket');
    expect(xmlData.project.dependencies[0].dependency[1].artifactId).toBe('Java-WebSocket');
    expect(xmlData.project.dependencies[0].dependency[1].version).toBe('2.3.1');
  });

  it('should return an array of pom properties when they exist', async () => {
    const parsedPom = {
      project: {
        properties: [
          {
            'jackson.version': '2.1.0',
            'snakeyaml.version': '3.0.0',
          },
        ],
      },
    };

    const pomProperties = await getPomProperties(parsedPom);

    expect(pomProperties.length).toBe(2);
    expect(pomProperties[0]).toBe('jackson.version');
    expect(pomProperties[1]).toBe('snakeyaml.version');
  });

  it('should return an empty array of pom properties when they do not exist', async () => {
    const parsedPom = {
      project: {},
    };

    const pomProperties = await getPomProperties(parsedPom);

    expect(pomProperties.length).toBe(0);
  });

  it('should return an array of pom dependencies when they exist', async () => {
    const parsedPom = {
      project: {
        dependencies: [
          {
            dependency: [
              {
                groupId: 'org.apache.httpcomponents',
                artifactId: 'httpclient',
              },
              {
                groupId: 'org.java-websocket',
                artifactId: 'Java-WebSocket',
                version: '2.3.1',
              },
            ],
          },
        ],
      },
    };

    const pomDependenciesWithVersions = await getPomDependenciesWithVersions(parsedPom);

    expect(pomDependenciesWithVersions.length).toBe(1);
    expect(pomDependenciesWithVersions[0].artifactId).toBe('Java-WebSocket');
    expect(pomDependenciesWithVersions[0].groupId).toBe('org.java-websocket');
    expect(pomDependenciesWithVersions[0].version).toBe('2.3.1');
  });

  it('should return an array of pom dependencies when they exist', async () => {
    const parsedPom = {
      project: [],
    };

    const pomDependenciesWithVersions = await getPomDependenciesWithVersions(parsedPom);

    expect(pomDependenciesWithVersions.length).toBe(0);
  });

  it('should get spring boot version from pom when it exists', async () => {
    const parsedPom = {
      project: {
        parent: [
          {
            groupId: 'org.springframework.boot',
            artifactId: 'spring-boot-starter-parent',
            version: '2.1.0',
          },
        ],
      },
    };

    const pomSpringBootVersion = await getPomSpringBootVersion(parsedPom);

    expect(pomSpringBootVersion).toBe('2.1.0');
  });

  it('should get spring boot version from pom when version is a range without space', async () => {
    const parsedPom = {
      project: {
        parent: [
          {
            groupId: 'org.springframework.boot',
            artifactId: 'spring-boot-starter-parent',
            version: '[3.1.0,3.2.0)',
          },
        ],
      },
    };

    const pomSpringBootVersion = await getPomSpringBootVersion(parsedPom);

    expect(pomSpringBootVersion).toBe('3.1.x');
  });

  it('should get spring boot version from pom when version is a range with space', async () => {
    const parsedPom = {
      project: {
        parent: [
          {
            groupId: 'org.springframework.boot',
            artifactId: 'spring-boot-starter-parent',
            version: '[2.7.5, 2.8.0)',
          },
        ],
      },
    };

    const pomSpringBootVersion = await getPomSpringBootVersion(parsedPom);

    expect(pomSpringBootVersion).toBe('2.7.x');
  });

  it("should return a value for spring boot version from pom when it doesn't exists", async () => {
    const parsedPom = {
      project: {
        parent: [{}],
      },
    };

    const pomSpringBootVersion = await getPomSpringBootVersion(parsedPom);

    expect(pomSpringBootVersion).toBe('');
  });

  it('should output mismatched packages', async () => {
    const parsedPom = {
      project: {
        parent: {
          groupId: 'org.springframework.boot',
          artifactId: 'spring-boot-starter-parent',
          version: '2.1.0',
        },
        dependencies: {
          dependency: [
            {
              groupId: 'org.apache.httpcomponents',
              artifactId: 'httpclient',
            },
            {
              groupId: 'org.java-websocket',
              artifactId: 'Java-WebSocket',
              version: '2.3.1',
            },
          ],
        },
      },
    };

    await retrieveSimilarPomPackages(parsedPom);
  });

  it('should read XML file from parent directory path', async () => {
    const testFile = `<project>
            <parent>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-parent</artifactId>
                <version>2.3.12.RELEASE</version>
            </parent>
            <properties>
                <java.version>1.8</java.version>
            </properties>
        </project>`;
    const parentDir = '../test-parent-dir-pom.xml';
    writeFileSync(parentDir, testFile);

    try {
      const xmlData = await getXMLFromFile(parentDir);

      expect(xmlData.project.parent[0].artifactId).toBe('spring-boot-starter-parent');
      expect(xmlData.project.parent[0].version).toBe('2.3.12.RELEASE');
    } finally {
      if (existsSync(parentDir)) {
        unlinkSync(parentDir);
      }
    }
  });

  it('should read XML file from current directory with ./ prefix', async () => {
    const testFile = `<project>
            <parent>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-starter-parent</artifactId>
                <version>2.5.0</version>
            </parent>
        </project>`;
    const currentDirFile = './test-current-dir-pom.xml';
    writeFileSync(currentDirFile, testFile);

    try {
      const xmlData = await getXMLFromFile(currentDirFile);

      expect(xmlData.project.parent[0].artifactId).toBe('spring-boot-starter-parent');
      expect(xmlData.project.parent[0].version).toBe('2.5.0');
    } finally {
      if (existsSync(currentDirFile)) {
        unlinkSync(currentDirFile);
      }
    }
  });

  afterAll(() => {
    if (existsSync(filename)) {
      unlinkSync(filename);
    }
  });
});
