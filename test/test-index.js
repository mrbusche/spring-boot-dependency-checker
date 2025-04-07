import { strictEqual } from 'node:assert';
import { unlink, writeFileSync } from 'node:fs';
import { getJsonFromFile } from '../shared.js';

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
