import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function readUploadVersion(output) {
  const ids = [...output.matchAll(/(?:Current )?Version ID:\s*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?![a-f0-9-])/gi)].map(match => match[1]);
  assert.equal(ids.length, 1, 'Wrangler must report exactly one uploaded version ID; refusing activation.');
  return ids[0];
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`version_id=${readUploadVersion(await readFile(process.argv[2], 'utf8'))}`);
}
