#!/usr/bin/env node
// check-examples.mjs — every field and enum value an example uses must be defined.
//
// Usage: node scripts/check-examples.mjs [--root <dir>]
// Exit:  0 pass · 1 an example uses something no field table defines · 2 could not run.
//
// A name counts as defined when it appears in `code` in a table row of
// spec/STANDARD.md. Envelope fields belong to in-toto and CloudEvents, and are allowed
// only at the envelope level.
// This catches an example that drifts from the field tables. It cannot tell whether
// an example is otherwise correct; the field tables are informative in this draft.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const fail2 = (msg) => {
  console.error(`[could-not-run] ${msg}`);
  process.exit(2);
};
const argv = process.argv.slice(2);
const rootFlagOnly = argv.length === 2 && argv[0] === "--root";
if (argv.length && !rootFlagOnly) fail2("usage: node scripts/check-examples.mjs [--root <dir>]");
const ROOT = resolve(argv[1] ?? ".");

let prose;
let files;
try {
  prose = readFileSync(join(ROOT, "spec", "STANDARD.md"), "utf8");
  files = readdirSync(join(ROOT, "examples")).filter((n) => n.endsWith(".json")).sort();
} catch (e) {
  fail2(`cannot read spec/STANDARD.md or examples/: ${e.code ?? e.message}`);
}
if (!files.length) fail2("examples/ holds no JSON files; a check over nothing proves nothing");

const rows = prose.split("\n").filter((l) => l.trimStart().startsWith("|"));
const defined = new Set([...rows.join("\n").matchAll(/`([^`]+)`/g)].map((m) => m[1]));

const STATEMENT_KEYS = new Set(["_type", "subject", "predicateType", "predicate"]);
const EVENT_KEYS = new Set(["specversion", "type", "source", "id", "time", "datacontenttype", "dataschema", "subject", "data"]);
const EVENT_PREFIX = "io.github.sunnypatneedi.osfp.";
// Keys of an in-toto digest set are algorithm names, not OSFP fields.
const DIGEST_SETS = new Set(["treeAtStart", "treeAtEnd", "outputDigest", "findings"]);
const ALGORITHMS = new Set([
  "sha256", "sha224", "sha384", "sha512", "sha512_224", "sha512_256", "sha3_224", "sha3_256", "sha3_384", "sha3_512",
  "blake2b", "blake2s", "gitCommit", "gitTree", "gitBlob", "gitTag", "dirHash",
]);
const ENUM_FIELDS = new Set(["recordType", "access", "operations", "enforcement", "state", "status", "limit", "result"]);

const problems = [];
let fields = 0;

function checkDigestSet(f, key, set) {
  for (const alg of Object.keys(set)) {
    fields++;
    if (!ALGORITHMS.has(alg)) problems.push(`examples/${f}: "${alg}" in ${key} is not an in-toto digest algorithm`);
  }
}

// Walks an OSFP record. Every field must appear in a field table, and every value of
// an enum field must too.
function walkRecord(f, value, key) {
  if (Array.isArray(value)) {
    for (const x of value) walkRecord(f, x, key);
    return;
  }
  if (typeof value === "string") {
    if (ENUM_FIELDS.has(key) && !defined.has(value)) problems.push(`examples/${f}: value "${value}" of "${key}" is defined in no table`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (DIGEST_SETS.has(key)) {
    checkDigestSet(f, key, value);
    return;
  }
  for (const [k, x] of Object.entries(value)) {
    fields++;
    if (!defined.has(k)) problems.push(`examples/${f}: field "${k}" is in no field table`);
    walkRecord(f, x, k);
  }
}

// An envelope may hold only its own fields; the OSFP record inside it is walked in full.
function checkEnvelope(f, doc, allowed, inner) {
  for (const k of Object.keys(doc)) {
    if (!allowed.has(k)) problems.push(`examples/${f}: envelope field "${k}" is not part of the envelope`);
  }
  if (doc[inner] && typeof doc[inner] === "object") walkRecord(f, doc[inner], null);
  else problems.push(`examples/${f}: the envelope carries no ${inner}`);
}

// Verification evidence names the checked tree by a gitTree or dirHash digest (OSFP.EV.1).
function checkSubjects(f, subjects) {
  for (const s of subjects) {
    const algs = Object.keys(s.digest ?? {});
    const treeDigest = algs.length > 0 && algs.every((a) => a === "gitTree" || a === "dirHash");
    if (!treeDigest) problems.push(`examples/${f}: subject "${s.name}" must use a gitTree or dirHash digest`);
  }
}

function checkDocument(f, doc) {
  if ("_type" in doc) {
    checkEnvelope(f, doc, STATEMENT_KEYS, "predicate");
    checkSubjects(f, doc.subject ?? []);
    return;
  }
  if ("specversion" in doc) {
    checkEnvelope(f, doc, EVENT_KEYS, "data");
    const typeOk = typeof doc.type === "string" && doc.type.startsWith(EVENT_PREFIX);
    if (!typeOk) problems.push(`examples/${f}: event type does not start with ${EVENT_PREFIX}`);
    return;
  }
  walkRecord(f, doc, null);
}

function readExample(f) {
  try {
    return JSON.parse(readFileSync(join(ROOT, "examples", f), "utf8"));
  } catch (e) {
    problems.push(`examples/${f} is not valid JSON: ${e.message}`);
    return null;
  }
}

for (const f of files) {
  const doc = readExample(f);
  if (doc) checkDocument(f, doc);
}

for (const p of problems) console.log(`FAIL [examples] ${p}`);
console.log(`${files.length} examples, ${fields} fields read; ${problems.length} problem(s) → exit ${problems.length ? 1 : 0}`);
process.exit(problems.length ? 1 : 0);
