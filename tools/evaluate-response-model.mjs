import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { evaluateResponseModel } from './lib/response-model-evaluation.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2];
  if (!path) throw new Error('Usage: node tools/evaluate-response-model.mjs DATA.json');
  const data = JSON.parse(readFileSync(path, 'utf8'));
  console.log(JSON.stringify(evaluateResponseModel(data.training, data.heldOut, data.options), null, 2));
}
