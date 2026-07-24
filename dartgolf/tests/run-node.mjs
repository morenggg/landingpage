/**
 * Testlauf ohne Browser:
 *   node tests/run-node.mjs
 *
 * Prüft die Module, die kein DOM benötigen (Normalisierung, Physik,
 * Kollision, Regeln, Punkte, Bahndaten).
 */

import './normalizer.test.js';
import './game.test.js';
import { runAll } from './runner.js';

const { passed, failed, failures } = runAll((line, ok) => {
  console.log(ok ? line : `\x1b[31m${line}\x1b[0m`);
});

console.log(`\n${passed} bestanden, ${failed} fehlgeschlagen`);
if (failed > 0) {
  console.log('\nFehlgeschlagen:');
  failures.forEach((line) => console.log(`  ${line}`));
  process.exit(1);
}
