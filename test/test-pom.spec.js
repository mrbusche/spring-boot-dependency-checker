import { strictEqual } from 'node:assert';
import { unlink, writeFileSync } from 'node:fs';
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
    await writeFileSync(filename, testFile);

    const xmlData = await getXMLFromFile(filename);

    strictEqual(xmlData.project.parent[0].artifactId, 'spring-boot-starter-parent');
    strictEqual(xmlData.project.parent[0].groupId, 'org.springframework.boot');
    strictEqual(xmlData.project.parent[0].version, '3.1.0');

    strictEqual(xmlData.project.properties[0]['java.version'], 1.8);
    strictEqual(xmlData.project.properties[0]['jackson.version'], '2.10.2');

    strictEqual(xmlData.project.dependencies[0].dependency.length, 2);
    strictEqual(xmlData.project.dependencies[0].dependency[0].groupId, 'org.apache.httpcomponents');
    strictEqual(xmlData.project.dependencies[0].dependency[0].artifactId, 'httpclient');
    strictEqual(xmlData.project.dependencies[0].dependency[1].groupId, 'org.java-websocket');
    strictEqual(xmlData.project.dependencies[0].dependency[1].artifactId, 'Java-WebSocket');
    strictEqual(xmlData.project.dependencies[0].dependency[1].version, '2.3.1');
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

    strictEqual(pomProperties.length, 2);
    strictEqual(pomProperties[0], 'jackson.version');
    strictEqual(pomProperties[1], 'snakeyaml.version');
  });

  it('should return an empty array of pom properties when they do not exist', async () => {
    const parsedPom = {
      project: {},
    };

    const pomProperties = await getPomProperties(parsedPom);

    strictEqual(pomProperties.length, 0);
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

    strictEqual(pomDependenciesWithVersions.length, 1);
    strictEqual(pomDependenciesWithVersions[0].artifactId, 'Java-WebSocket');
    strictEqual(pomDependenciesWithVersions[0].groupId, 'org.java-websocket');
    strictEqual(pomDependenciesWithVersions[0].version, '2.3.1');
  });

  it('should return an array of pom dependencies when they exist', async () => {
    const parsedPom = {
      project: [],
    };

    const pomDependenciesWithVersions = await getPomDependenciesWithVersions(parsedPom);

    strictEqual(pomDependenciesWithVersions.length, 0);
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

    strictEqual(pomSpringBootVersion, '2.1.0');
  });

  it("should return a value for spring boot version from pom when it doesn't exists", async () => {
    const parsedPom = {
      project: {
        parent: [{}],
      },
    };

    const pomSpringBootVersion = await getPomSpringBootVersion(parsedPom);

    strictEqual(pomSpringBootVersion, '');
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

  after(() => {
    unlink(filename, (err) => {
      if (err) throw err;
    });
  });
});
