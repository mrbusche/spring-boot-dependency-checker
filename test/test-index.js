import { strictEqual } from 'node:assert';
import { writeFileSync } from 'fs';
import { unlink } from 'node:fs';
import { getComponents, getJsonFromFile, getSpringBootVersion } from '../index.js';

describe('test file reading', () => {
    const filename = 'testFile.json';

    it('should read a properly formatted JSON file', async () => {
        const testFile = {
            components: [{
                'name': 'spring-boot', 'version': '3.1.1',
            }],
        };
        await writeFileSync(filename, JSON.stringify(testFile, null, 2));

        const jsonData = await getJsonFromFile(filename);


        strictEqual(jsonData.components[0].name, 'spring-boot');
        strictEqual(jsonData.components[0].version, '3.1.1');
    });

    it('should retrieve components when they exist', async () => {
        const testFile = {
            components: [{
                'name': 'new-name', 'version': '7.1.19',
            }],
        };
        await writeFileSync(filename, JSON.stringify(testFile, null, 2));

        const jsonData = await getComponents(filename);


        strictEqual(jsonData[0].name, 'new-name');
        strictEqual(jsonData[0].version, '7.1.19');
    });

    it('should gracefully exit when components do not exist', async () => {
        const testFile = {
            bananas: [{
                'name': 'new-name', 'version': '7.1.19',
            }],
        };
        await writeFileSync(filename, JSON.stringify(testFile, null, 2));

        const jsonData = await getComponents(filename);

        strictEqual(jsonData, undefined);
    });

    after(() => {
        unlink(filename, (err) => {
            if (err) throw err;
        });
    });
});

describe('test getSpringBootVersion', () => {
    it('should get spring boot with group, name, and version', async () => {
        const components = [{
            'group': 'org.springframework.boot', 'name': 'spring-boot', 'version': '3.1.9',
        }];
        const springBootVersion = await getSpringBootVersion(components);
        strictEqual(springBootVersion, '3.1.9');
    });

    it('should get spring boot with only name and version', async () => {
        const components = [{
            'name': 'spring-boot', 'version': '3.1.1',
        }];
        const springBootVersion = await getSpringBootVersion(components);
        strictEqual(springBootVersion, '3.1.1');
    });

    it('should return empty string when spring boot version is not found', async () => {
        const components = [{}];
        const springBootVersion = await getSpringBootVersion(components);
        strictEqual(springBootVersion, '');
    });
});
