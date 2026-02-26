import { strictEqual } from 'node:assert';
import { unlink, writeFileSync } from 'node:fs';
import { compareDependencyVersion, getJsonFromFile, Package } from '../shared.js';

describe('test file reading', () => {
  const filename = 'testFile.json';

  it('should read a properly formatted JSON file', async () => {
    const testFile = {
      components: [
        {
          name: 'spring-boot',
          version: '3.1.1',
        },
      ],
    };
    await writeFileSync(filename, JSON.stringify(testFile, null, 2));

    const jsonData = await getJsonFromFile(filename);

    strictEqual(jsonData.components[0].name, 'spring-boot');
    strictEqual(jsonData.components[0].version, '3.1.1');
  });

  after(() => {
    unlink(filename, (err) => {
      if (err) throw err;
    });
  });
});

describe('test version comparison', () => {
  it('should classify input version as older', () => {
    const versionComparison = compareDependencyVersion('1.2.0', '1.3.0');
    strictEqual(versionComparison, 'older');
  });

  it('should classify input version as same', () => {
    const versionComparison = compareDependencyVersion('1.2.0', '1.2');
    strictEqual(versionComparison, 'same');
  });

  it('should classify input version as newer', () => {
    const versionComparison = compareDependencyVersion('1.2.1', '1.2.0');
    strictEqual(versionComparison, 'newer');
  });

  it('should include versionComparison in package output', () => {
    const pkg = new Package('org.example', 'example-lib', '2.0.0-RC1', '2.0.0');
    strictEqual(pkg.versionComparison, 'older');
  });
});
