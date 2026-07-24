/**
 * DartGolf – winziges Testgerüst
 *
 * Läuft ohne Abhängigkeiten sowohl im Browser (tests/index.html) als auch
 * mit Node (`node tests/run-node.mjs`).
 */

/** @type {{name:string, fn:() => void}[]} */
const tests = [];

/**
 * Registriert einen Test.
 * @param {string} name
 * @param {() => void} fn
 */
export function test(name, fn) {
  tests.push({ name, fn });
}

/** Wirft, wenn die Bedingung nicht erfüllt ist. */
export function assert(condition, message) {
  if (!condition) throw new Error(message || 'Bedingung nicht erfüllt');
}

/** Vergleicht zwei Werte streng. */
export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Werte unterschiedlich'}: erwartet ${JSON.stringify(expected)}, erhalten ${JSON.stringify(actual)}`);
  }
}

/** Vergleicht Zahlen mit Toleranz. */
export function assertClose(actual, expected, tolerance = 0.001, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || 'Zahl außerhalb der Toleranz'}: erwartet ${expected} ± ${tolerance}, erhalten ${actual}`);
  }
}

/** Vergleicht Strukturen über JSON. */
export function assertDeepEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) {
    throw new Error(`${message || 'Strukturen unterschiedlich'}:\n  erwartet ${b}\n  erhalten ${a}`);
  }
}

/**
 * Führt alle registrierten Tests aus.
 * @param {(line: string, ok: boolean) => void} [report]
 * @returns {{passed: number, failed: number, failures: string[]}}
 */
export function runAll(report) {
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const { name, fn } of tests) {
    try {
      fn();
      passed += 1;
      if (report) report(`✓ ${name}`, true);
    } catch (error) {
      failed += 1;
      const line = `✗ ${name}: ${error.message}`;
      failures.push(line);
      if (report) report(line, false);
    }
  }

  return { passed, failed, failures };
}
