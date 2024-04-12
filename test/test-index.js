import assert from 'node:assert';
import { getSpringBootVersion } from '../index.js';

describe('test getSpringBootVersion', () => {
    it('should get spring boot with group, name, and version', async () => {
        const components = [{
            'group': 'org.springframework.boot', 'name': 'spring-boot', 'version': '3.1.9',
        }];
        const springBootVersion = await getSpringBootVersion(components);
        assert.strictEqual(springBootVersion, '3.1.9');
    });

    it('should get spring boot with only name and version', async () => {
        const components = [{
            'name': 'spring-boot', 'version': '3.1.1',
        }];
        const springBootVersion = await getSpringBootVersion(components);
        assert.strictEqual(springBootVersion, '3.1.1');
    });

    it('should throw an error when spring boot versio is not found', async () => {
        const components = [{}];
        // const springBootVersion = await getSpringBootVersion(components);
        await assert.rejects(async () => {
            await getSpringBootVersion(components);
        }, Error('no spring boot version found'));
    });
});
