#!/usr/bin/env node
// check-osfp.mjs — the checks only OSFP needs. scripts/check-standard.mjs checks the document
// against its data. This script checks the data against its schema, the examples, the
// conformance table, and the references.
//
// Usage: node scripts/check-osfp.mjs [--root <dir>]
// Exit:  0 pass · 1 one or more violations · 2 could not run.
//
// Checks
//   [schema]      spec/standard.json is valid against schema/standard.schema.json. Only the keywords
//                 that schema uses are implemented; any other keyword stops the run (exit 2)
//   [examples]    each example uses only its own record's fields, each field's own values, and
//                 envelope fields only at the envelope level
//   [rules]       the examples obey the rules a machine can check, one by one and as a set
//   [classes]     the conformance table in section 12 lists exactly the rules whose classes in
//                 spec/standard.json name that class
//   [references]  every [key] in the prose has one entry in section 18, every entry is cited, and
//                 every bibliography URL and DOI in the data appears in its entry
//
// The prose is read with HTML comments removed, so nothing hidden from a reader counts. The
// vocabulary below is compared with the prose's tables, so the two cannot drift apart silently.
// It does not test an implementation, and it cannot tell whether a rule is right.

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

function couldNotRun(msg) {
  console.error(`[could-not-run] ${msg}`);
  process.exit(2);
}
process.on("uncaughtException", (e) => couldNotRun(`internal error: ${e?.message ?? e}`));

const argv = process.argv.slice(2);
if (argv.length && !(argv.length === 2 && argv[0] === "--root")) couldNotRun("usage: node scripts/check-osfp.mjs [--root <dir>]");
const ROOT = resolve(argv[1] ?? ".");

function readText(path) {
  try {
    return readFileSync(join(ROOT, path), "utf8");
  } catch (e) {
    return couldNotRun(`cannot read ${path}: ${e.code ?? e.message}`);
  }
}
function readJson(path) {
  const text = readText(path);
  try {
    return JSON.parse(text);
  } catch (e) {
    return couldNotRun(`${path} is not valid JSON: ${e.message}`);
  }
}

const prose = readText("spec/STANDARD.md").replace(/<!--[\s\S]*?-->/g, "");
const data = readJson("spec/standard.json");
const schema = readJson("schema/standard.schema.json");
if (!Array.isArray(data.items) || !Array.isArray(data.bibliography)) couldNotRun("spec/standard.json has no items or no bibliography");

// ------------------------------------------------------------------ reporting

const ORDER = ["schema", "examples", "rules", "classes", "references"];
const failures = new Map(ORDER.map((c) => [c, []]));
const notes = new Map();
const fail = (check, msg) => failures.get(check).push(msg);
const note = (check, msg) => notes.set(check, msg);

// ------------------------------------------------------------------ the prose, read once

// "## 7. Task grant" → sections.get("Task grant") is the text under that heading.
const sections = new Map();
for (const part of prose.split(/^## /m).slice(1)) {
  const [heading, ...body] = part.split("\n");
  sections.set(heading.replace(/^\d+\.\s*/, "").trim(), body.join("\n"));
}
const section = (title) => sections.get(title) ?? couldNotRun(`spec/STANDARD.md has no "${title}" section`);
const codeWords = (text) => new Set([...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]));

// Each table in a text, as its header cells and its rows of cells.
function tablesIn(text) {
  const tables = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (!line.trimStart().startsWith("|")) {
      current = null;
      continue;
    }
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
    if (!current) tables.push((current = { header: cells, rows: [] }));
    else if (!cells.every((c) => /^:?-+:?$/.test(c))) current.rows.push(cells);
  }
  return tables;
}
function table(title, firstHeader) {
  return tablesIn(section(title)).find((t) => t.header[0] === firstHeader) ?? couldNotRun(`section "${title}" has no table headed "${firstHeader}"`);
}
const firstColumn = (t) => new Set(t.rows.flatMap((r) => [...codeWords(r[0])]));
const rowOf = (t, field) => t.rows.find((r) => codeWords(r[0]).has(field));
const wordsOfRow = (t, field) => codeWords(rowOf(t, field)?.join(" ") ?? "");

// ------------------------------------------------------------------ the vocabulary

// The fields of each record are the first column of its field table.
const RECORDS = {
  "task-grant": table("Task grant", "Field"),
  outcome: table("Outcome", "Field"),
  "verification-evidence": table("Verification evidence", "Predicate field"),
  progress: table("Progress", "Field"),
};
const FIELDS = Object.fromEntries(Object.entries(RECORDS).map(([type, t]) => [type, firstColumn(t)]));
const CHECK_TABLE = table("Verification evidence", "Check field");

// The objects inside a record, and the fields each one holds. Each name must appear in its
// parent's row of the field table.
const NESTED = {
  resources: ["task-grant", ["uri", "access"]],
  disclosures: ["task-grant", ["source", "revision", "destination"]],
  tools: ["task-grant", ["server", "name"]],
  restrictions: ["task-grant", ["target", "rule", "enforcement"]],
  limits: ["task-grant", ["startAckSeconds", "totalSeconds"]],
  harness: ["outcome", ["name", "version"]],
};
const SHAPES = { checks: firstColumn(CHECK_TABLE) };
for (const [parent, [type, names]] of Object.entries(NESTED)) {
  const words = wordsOfRow(RECORDS[type], parent);
  for (const n of names) if (!words.has(n)) fail("examples", `the checker expects "${n}" inside "${parent}", but the ${type} row for "${parent}" does not name it`);
  SHAPES[parent] = new Set(names);
}

// The values of each enum field. A list read from a table's first column comes from the prose;
// a list written here must appear, word for word, in the row of the field it names.
const ENUMS = {
  recordType: { values: Object.keys(RECORDS) },
  access: { table: RECORDS["task-grant"], row: "resources", values: ["read", "write"] },
  operations: { values: [...firstColumn(table("Task grant", "Operation"))] },
  enforcement: { table: RECORDS["task-grant"], row: "restrictions", values: ["enforced", "instruction"] },
  state: { values: [...firstColumn(table("Outcome", "State"))] },
  status: { table: CHECK_TABLE, row: "status", values: ["passed", "failed", "not-run", "incomplete"] },
  event: { values: [...firstColumn(table("Progress", "Event"))] },
  limit: { table: RECORDS.progress, row: "limit", values: ["startAckSeconds", "totalSeconds"] },
  result: { table: RECORDS.progress, row: "result", values: ["clean", "findings", "aborted", "missed", "unfinished"] },
};
for (const [field, e] of Object.entries(ENUMS)) {
  if (!e.table) continue;
  const words = wordsOfRow(e.table, e.row);
  for (const v of e.values) if (!words.has(v)) fail("examples", `the checker lists "${v}" as a value of "${field}", but the "${e.row}" row does not`);
}
for (const [type, t] of Object.entries(RECORDS)) {
  if (!codeWords(t.rows[0]?.join(" ") ?? "").has(type)) fail("examples", `the ${type} field table does not say that its recordType is ${type}`);
}
const VALUES = Object.fromEntries(Object.entries(ENUMS).map(([k, e]) => [k, new Set(e.values)]));

const TERMINAL = ["completed", "failed", "canceled", "rejected"];
const TREE_ALGORITHMS = ["gitTree", "dirHash"];
const DIGEST_FIELDS = new Set(["treeAtStart", "treeAtEnd", "outputDigest", "findings"]);
const PREDICATE_TYPE = section("Verification evidence").match(/^`(https:\/\/[^`]+)`$/m)?.[1];
const EVENT_PREFIX = section("Progress").match(/prefix `([^`]+)`/)?.[1];
if (!PREDICATE_TYPE || !EVENT_PREFIX) couldNotRun("cannot find the predicate type in section 9 or the event prefix in section 10");
const STATEMENT_TYPE = "https://in-toto.io/Statement/v1";
const STATEMENT_KEYS = new Set(["_type", "subject", "predicateType", "predicate"]);
const EVENT_KEYS = new Set(["specversion", "type", "source", "id", "time", "datacontenttype", "dataschema", "subject", "data"]);

// ------------------------------------------------------------------ small helpers

const list = (x) => (Array.isArray(x) ? x : []);
const filled = (s) => typeof s === "string" && s.length > 0;
const count = (n) => Number.isInteger(n) && n >= 0;
const positive = (n) => Number.isInteger(n) && n > 0;
const isUtc = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(s) && !Number.isNaN(Date.parse(s));
const ms = (s) => (isUtc(s) ? Date.parse(s) : NaN);
const canonical = (o) => JSON.stringify(Object.entries(o ?? {}).sort(([a], [b]) => a.localeCompare(b)));
// Two in-toto digest sets match when any algorithm they share has the same value.
const digestsMatch = (a, b) => Object.entries(a ?? {}).some(([alg, v]) => b?.[alg] === v);
const isTreeDigest = (d) => d && typeof d === "object" && Object.keys(d).length > 0 && Object.keys(d).every((a) => TREE_ALGORITHMS.includes(a));

// ------------------------------------------------------------------ [schema]

// The JSON Schema keywords schema/standard.schema.json uses. A keyword outside this list stops the
// run, so the check can never pass by skipping a constraint it does not understand.
const SCHEMA_KEYWORDS = new Set([
  "$schema", "title", "description", "$defs", "$ref", "type", "const", "enum", "pattern", "minLength", "format",
  "required", "properties", "additionalProperties", "anyOf", "items", "minItems", "uniqueItems",
]);
const typeOf = (x) => (Array.isArray(x) ? "array" : x === null ? "null" : Number.isInteger(x) ? "integer" : typeof x);
const deref = (s) => (s.$ref ? deref(s.$ref.split("/").slice(1).reduce((o, k) => o?.[k], schema) ?? couldNotRun(`cannot resolve ${s.$ref}`)) : s);

function validate(rule, x, at) {
  const s = deref(rule);
  for (const k of Object.keys(s)) if (!SCHEMA_KEYWORDS.has(k)) couldNotRun(`schema/standard.schema.json uses "${k}", which this check does not implement`);
  const problem = (msg) => fail("schema", `${at} ${msg}`);
  const type = typeOf(x);
  if (s.type && s.type !== type && !(s.type === "number" && type === "integer")) return problem(`is ${type}, not ${s.type}`);
  if ("const" in s && x !== s.const) problem(`is not ${JSON.stringify(s.const)}`);
  if (s.enum && !s.enum.includes(x)) problem(`is ${JSON.stringify(x)}, not one of ${s.enum.join(", ")}`);
  if (s.pattern && !new RegExp(s.pattern, "u").test(x)) problem(`does not match ${s.pattern}`);
  if (s.minLength && x.length < s.minLength) problem(`is shorter than ${s.minLength}`);
  if (s.format === "uri" && !/^[a-z][a-z0-9+.-]*:\S+$/i.test(x)) problem("is not a URI");
  for (const k of s.required ?? []) if (!(k in x)) problem(`has no ${k}`);
  if (s.anyOf && !s.anyOf.some((alt) => (alt.required ?? []).every((k) => k in x))) problem(`has none of ${s.anyOf.map((a) => a.required).join(" or ")}`);
  if (s.properties || s.additionalProperties === false) {
    for (const [k, v] of Object.entries(x)) {
      if (s.properties?.[k]) validate(s.properties[k], v, `${at}.${k}`);
      else if (s.additionalProperties === false) problem(`has ${k}, which the schema does not allow`);
    }
  }
  if (s.items) x.forEach((v, i) => validate(s.items, v, `${at}[${i}]`));
  if (s.minItems && x.length < s.minItems) problem(`has fewer than ${s.minItems} items`);
  if (s.uniqueItems && new Set(x.map((v) => JSON.stringify(v))).size !== x.length) problem("repeats an item");
}

function checkSchema() {
  validate(schema, data, "spec/standard.json");
  note("schema", `${data.items.length} rules and ${data.bibliography.length} sources in spec/standard.json validated against schema/standard.schema.json`);
}

// ------------------------------------------------------------------ [examples]

// An example is an OSFP record, or an in-toto Statement or a CloudEvent that carries one.
function readExamples() {
  let files;
  try {
    files = readdirSync(join(ROOT, "examples")).filter((n) => n.endsWith(".json")).sort();
  } catch (e) {
    couldNotRun(`cannot read examples/: ${e.code ?? e.message}`);
  }
  if (!files.length) couldNotRun("examples/ holds no JSON files; a check over nothing proves nothing");
  const examples = [];
  for (const name of files) {
    const f = `examples/${name}`;
    let doc;
    try {
      doc = JSON.parse(readFileSync(join(ROOT, f), "utf8"));
    } catch (e) {
      fail("examples", `${f} is not valid JSON: ${e.message}`);
      continue;
    }
    let ex = { f, kind: "record", envelope: null, record: doc };
    if ("_type" in doc) ex = { f, kind: "statement", envelope: doc, record: doc.predicate };
    else if ("specversion" in doc) ex = { f, kind: "event", envelope: doc, record: doc.data };
    if (ex.record && typeof ex.record === "object" && !Array.isArray(ex.record)) examples.push(ex);
    else fail("examples", `${f}: the envelope carries no OSFP record`);
  }
  return { files, examples };
}

const ENVELOPE_RECORD = { statement: "verification-evidence", event: "progress" };

function checkEnvelope({ f, kind, envelope, record }) {
  if (kind === "record") return;
  const allowed = kind === "statement" ? STATEMENT_KEYS : EVENT_KEYS;
  for (const k of Object.keys(envelope)) if (!allowed.has(k)) fail("examples", `${f}: "${k}" is not a field of the envelope`);
  if (record.recordType !== ENVELOPE_RECORD[kind]) fail("examples", `${f}: this envelope carries a ${ENVELOPE_RECORD[kind]} record, not "${record.recordType}"`);
  if (kind === "statement") {
    if (envelope._type !== STATEMENT_TYPE) fail("examples", `${f}: _type is not ${STATEMENT_TYPE}`);
    if (envelope.predicateType !== PREDICATE_TYPE) fail("examples", `${f}: predicateType is not the one section 9 names`);
    return;
  }
  if (envelope.specversion !== "1.0") fail("examples", `${f}: specversion is not 1.0`);
  const name = typeof envelope.type === "string" && envelope.type.startsWith(EVENT_PREFIX) ? envelope.type.slice(EVENT_PREFIX.length) : null;
  if (!VALUES.event.has(name)) fail("examples", `${f}: event type "${envelope.type}" is not ${EVENT_PREFIX} followed by an event in section 10`);
  else if (record.event !== name) fail("examples", `${f}: the event type says ${name}, but the record's event is "${record.event}"`);
}

let fieldsRead = 0;

// Checks one field's value: its enum values, the fields of any object it holds, and digest sets.
function checkValue(f, key, value) {
  if (VALUES[key]) for (const v of [value].flat()) if (!VALUES[key].has(v)) fail("examples", `${f}: ${JSON.stringify(v)} is not a value of "${key}"`);
  if (DIGEST_FIELDS.has(key)) {
    for (const set of [value].flat()) {
      const ok = set && typeof set === "object" && !Array.isArray(set) && Object.keys(set).length && Object.values(set).every(filled);
      if (!ok) fail("examples", `${f}: "${key}" is not an in-toto digest set`);
    }
    return;
  }
  const shape = SHAPES[key];
  if (!shape) return;
  for (const item of [value].flat()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      fail("examples", `${f}: "${key}" holds something that is not an object`);
      continue;
    }
    for (const [k, v] of Object.entries(item)) {
      fieldsRead++;
      if (shape.has(k)) checkValue(f, k, v);
      else fail("examples", `${f}: "${k}" is not a field of "${key}"`);
    }
  }
}

function checkExamples(examples, files) {
  for (const ex of examples) {
    checkEnvelope(ex);
    const fields = FIELDS[ex.record.recordType];
    if (!fields) {
      fail("examples", `${ex.f}: recordType "${ex.record.recordType}" is not one of ${Object.keys(RECORDS).join(", ")}`);
      continue;
    }
    for (const [k, v] of Object.entries(ex.record)) {
      fieldsRead++;
      if (fields.has(k)) checkValue(ex.f, k, v);
      else fail("examples", `${ex.f}: "${k}" is not a field of the ${ex.record.recordType} record`);
    }
  }
  note("examples", `${files.length} examples, ${fieldsRead} fields read, each against its own record's tables and its own values`);
}

// ------------------------------------------------------------------ [rules], one example at a time

// Each rule takes an example and returns the problems it finds, as strings.
const EVERY_RECORD = [
  ["OSFP.GE.1", ({ record: r }) => ["osfpVersion", "recordType", "id"].filter((k) => !filled(r[k])).map((k) => `has no ${k}`)],
  ["version", ({ record: r }) => (r.osfpVersion === data.version ? [] : [`has osfpVersion "${r.osfpVersion}", not ${data.version}`])],
  ["OSFP.GE.2", ({ record: r, envelope }) => {
    const stamps = Object.entries(r).filter(([k]) => k.endsWith("At"));
    if (envelope && "time" in envelope) stamps.push(["time", envelope.time]);
    return stamps.filter(([, v]) => !isUtc(v)).map(([k, v]) => `has ${k} "${v}", not an RFC 3339 date-time in UTC with the offset Z`);
  }],
];

const checksOf = (ex) => list(ex.record.checks);
const each = (ex, test, says) => checksOf(ex).filter(test).map((c) => `has a check "${c.name}" that ${says}`);

const BY_RECORD = {
  "task-grant": [
    ["OSFP.AU.2", ({ record: g }) => (filled(g.approvedBy) && isUtc(g.approvedAt) ? [] : ["names no approver, or no approval time"])],
    ["OSFP.AU.4", ({ record: g }) => ["resources", "operations", "disclosures", "tools"].filter((k) => !Array.isArray(g[k])).map((k) => `does not list its ${k}`)],
    ["OSFP.AU.7", ({ record: g }) => list(g.restrictions).filter((x) => !filled(x.target) || !filled(x.rule) || !filled(x.enforcement)).map(() => "has a restriction without a target, a rule, or an enforcement")],
    ["OSFP.AU.8", ({ record: g }) => list(g.disclosures).filter((d) => !filled(d.source) || !filled(d.revision) || !filled(d.destination)).map(() => "has a disclosure without its source, revision, or destination")],
    ["OSFP.PF.2", ({ record: g }) => list(g.tools).filter((t) => !filled(t.server) || !filled(t.name)).map(() => "has a tool without its server or its name")],
    ["OSFP.PR.1", ({ record: g }) => (positive(g.limits?.startAckSeconds) && positive(g.limits?.totalSeconds) ? [] : ["does not state startAckSeconds and totalSeconds"])],
    ["section 7", ({ record: g }) => [
      filled(g.taskId) === filled(g.scheduleId) && "names both or neither of taskId and scheduleId",
      !positive(g.generation) && "has no positive generation",
      filled(g.derivedFrom) && !filled(g.taskId) && "derives from a standing grant but names no task",
      !(ms(g.expiresAt) > ms(g.approvedAt)) && "does not expire after it was approved",
      "unknownAttempts" in g && !(filled(g.taskId) && Array.isArray(g.unknownAttempts) && g.unknownAttempts.every(filled)) && "lists unknownAttempts that are not attempts of its own task",
      "inspection" in g && typeof g.inspection !== "boolean" && "has an inspection flag that is not true or false",
    ].filter(Boolean)],
  ],
  outcome: [
    ["section 8", ({ record: o }) => [!positive(o.sequence) && "has no positive sequence", !isUtc(o.stateAt) && "has no stateAt"].filter(Boolean)],
    ["OSFP.OU.7", ({ record: o }) => {
      const [req, conf, clean] = [o.stopRequestedAt, o.stopConfirmedAt, o.cleanupConfirmedAt];
      return [
        conf && !req && "confirms a stop that was never requested",
        clean && !conf && "confirms cleanup before the stop was confirmed",
        req && conf && ms(conf) < ms(req) && "confirms the stop before it was requested",
        conf && clean && ms(clean) < ms(conf) && "confirms cleanup before the stop",
      ].filter(Boolean);
    }],
  ],
  "verification-evidence": [
    ["OSFP.EV.1", ({ envelope }) => {
      const subjects = list(envelope?.subject);
      if (!subjects.length) return ["has no subject"];
      return subjects.filter((s) => !isTreeDigest(s.digest)).map((s) => `names subject "${s.name}" by something other than a gitTree or dirHash digest`);
    }],
    ["OSFP.EV.1", (ex) => each(ex, (c) => !list(ex.envelope?.subject).some((s) => digestsMatch(s.digest, c.treeAtStart)), "checked a tree the subject does not name")],
    ["section 9", (ex) => each(ex, (c) => !isTreeDigest(c.treeAtStart) || !isTreeDigest(c.treeAtEnd), "names its tree by something other than a gitTree or dirHash digest")],
    ["section 9", (ex) => each(ex, (c) => ![c.unitsExamined, c.unitsFailed, c.unitsSkipped].every(count) || c.unitsFailed > c.unitsExamined, "does not count its units, or counts more failures than units")],
    ["OSFP.EV.3", (ex) => each(ex, (c) => c.status === "passed" && !(c.exitStatus === 0 && c.unitsExamined >= 1 && c.unitsFailed === 0), "is passed without a success exit, an examined unit, and no failures")],
    ["section 9", (ex) => each(ex, (c) => c.status === "failed" && !(c.unitsExamined >= 1 && (c.unitsFailed >= 1 || c.exitStatus !== 0)), "is failed without an examined unit that failed")],
    ["section 9", (ex) => each(ex, (c) => c.status === "not-run" && c.unitsExamined !== 0, "is not-run but examined units")],
    ["OSFP.EV.4", (ex) => each(ex, (c) => !Number.isInteger(c.exitStatus), "records no exit status")],
    ["OSFP.EV.5", (ex) => each(ex, (c) => (c.outputComplete === false || !digestsMatch(c.treeAtStart, c.treeAtEnd)) && c.status !== "incomplete", "lost output or saw the tree change, but is not incomplete")],
    ["OSFP.EV.6", (ex) => each(ex, (c) => typeof c.inputsChanged !== "boolean" || !Array.isArray(c.changedInputs) || c.inputsChanged !== c.changedInputs.length > 0, "does not say consistently whether, and where, the attempt changed what decides it")],
    ["OSFP.EV.7", (ex) => each(ex, (c) => typeof c.answersReachable !== "boolean", "does not say whether the attempt could read its withheld answers")],
  ],
  progress: [
    ["OSFP.PR.7", ({ record: p }) => [!VALUES.event.has(p.event) && "does not name its event", !isUtc(p.occurredAt) && "does not say when its event happened"].filter(Boolean)],
    ["section 10", ({ record, envelope }) => progressProblems(record, envelope)],
  ],
};

// Which progress fields belong to which events, and the results each event may carry (section 10).
const ONLY_ON = { limit: ["limit-expired"], action: ["limit-expired"], state: ["ended"], expectedAt: ["overdue"], result: ["ended", "overdue"] };
const RESULTS = { ended: ["clean", "findings", "aborted"], overdue: ["missed", "unfinished"] };

function progressProblems(p, envelope) {
  const e = p.event;
  const overdue = e === "overdue";
  const misplaced = Object.keys(ONLY_ON).filter((k) => k in p && !ONLY_ON[k].includes(e)).map((k) => `is a ${e} event that carries "${k}"`);
  return [
    ...misplaced,
    "result" in p && RESULTS[e] && !RESULTS[e].includes(p.result) && `is a ${e} event with the result "${p.result}"`,
    e === "limit-expired" && !(p.limit && filled(p.action) && filled(p.attemptId)) && "is a limit-expired event without its limit, action, or attempt",
    overdue && !(p.result && isUtc(p.expectedAt)) && "is an overdue event without its result or expectedAt",
    overdue && p.result === "missed" && "attemptId" in p && "is a missed overdue event that names an attempt",
    overdue && p.result === "unfinished" && !filled(p.attemptId) && "is an unfinished overdue event that names no attempt",
    overdue && !(ms(p.expectedAt) < ms(p.occurredAt)) && "is an overdue event that happened before the task was expected",
    e === "ended" && !TERMINAL.includes(p.state) && "is an ended event without a terminal state",
    envelope && "time" in envelope && envelope.time !== p.occurredAt && "has a CloudEvent time that differs from its occurredAt",
  ].filter(Boolean);
}

let ruleChecks = 0;

function checkEachExample(examples) {
  for (const ex of examples) {
    for (const [rule, test] of [...EVERY_RECORD, ...(BY_RECORD[ex.record.recordType] ?? [])]) {
      ruleChecks++;
      for (const problem of test(ex)) fail("rules", `${rule}: ${ex.f} ${problem}`);
    }
  }
}

// ------------------------------------------------------------------ [rules], across the examples

const ACCESS = { read: 1, write: 2 };

// What a derived grant permits beyond its standing grant, or keeps less of (OSFP.AU.6).
function beyond(derived, standing) {
  const extra = [];
  for (const r of list(derived.resources)) {
    const s = list(standing.resources).find((x) => x.uri === r.uri);
    if (!s || !(ACCESS[r.access] <= ACCESS[s.access])) extra.push(`${r.access} access to ${r.uri}`);
  }
  for (const op of list(derived.operations)) if (!list(standing.operations).includes(op)) extra.push(`the operation ${op}`);
  for (const k of ["disclosures", "tools"]) {
    const allowed = new Set(list(standing[k]).map(canonical));
    for (const x of list(derived[k])) if (!allowed.has(canonical(x))) extra.push(`a ${k.slice(0, -1)} that the standing grant lacks`);
  }
  const kept = new Set(list(derived.restrictions).map(canonical));
  for (const x of list(standing.restrictions)) if (!kept.has(canonical(x))) extra.push(`no restriction on ${x.target}`);
  for (const k of ["startAckSeconds", "totalSeconds"]) if (!(derived.limits?.[k] <= standing.limits?.[k])) extra.push(`a longer or missing ${k}`);
  if (!(ms(derived.expiresAt) <= ms(standing.expiresAt))) extra.push("a later or missing expiry");
  if (standing.inspection === true && derived.inspection !== true) extra.push("no inspection flag");
  return extra;
}

// The examples grouped by record, with two lookups the set rules share.
function groupExamples(examples) {
  const byType = (type) => examples.filter((x) => x.record.recordType === type);
  const grants = byType("task-grant");
  const grantsOf = (taskId) => grants.filter((g) => g.record.taskId === taskId);
  return {
    examples,
    grants,
    outcomes: byType("outcome"),
    events: byType("progress"),
    when: (x) => ms(x.record.stateAt ?? x.record.checkedAt ?? x.record.occurredAt),
    grantsOf,
    latestGrantOf: (taskId) => grantsOf(taskId).reduce((a, g) => (!a || g.record.generation > a.record.generation ? g : a), null),
  };
}
const ruleFail = (id, f, msg) => fail("rules", `${id}: ${f} ${msg}`);

// Each item whose key an earlier item already used, paired with that earlier item.
function repeats(items, keyOf) {
  const seen = new Map();
  const found = [];
  for (const x of items) {
    const key = keyOf(x);
    if (seen.has(key)) found.push([x, seen.get(key)]);
    else seen.set(key, x);
  }
  return found;
}

// Each set rule takes the grouped examples and returns how many checks it made.

// No record reuses an id (OSFP.GE.1), no event reuses a source and an id (CloudEvents), and no
// task or schedule repeats a generation (section 7).
function checkRepeats({ examples, grants }) {
  for (const [x, first] of repeats(examples, (y) => y.record.id)) ruleFail("OSFP.GE.1", x.f, `reuses the id of ${first.f}`);
  const events = examples.filter((y) => y.kind === "event");
  for (const [x, first] of repeats(events, (y) => `${y.envelope.source} ${y.envelope.id}`)) ruleFail("CloudEvents", x.f, `reuses the source and id of ${first.f}`);
  const generation = (g) => `${g.record.taskId ?? g.record.scheduleId}#${g.record.generation}`;
  for (const [g, first] of repeats(grants, generation)) ruleFail("section 7", g.f, `repeats generation ${g.record.generation} of ${first.f}`);
  return 3;
}

// Every record about an attempt comes after a grant for its task (OSFP.AU.1).
function checkGrantsFirst({ examples, grantsOf, when }) {
  const attempts = examples.filter((x) => filled(x.record.taskId) && filled(x.record.attemptId));
  for (const x of attempts) {
    const granted = grantsOf(x.record.taskId).some((g) => ms(g.record.approvedAt) <= when(x));
    if (!granted) ruleFail("OSFP.AU.1", x.f, "is about an attempt of a task with no grant approved before it");
  }
  return attempts.length;
}

// A derived grant stays within a standing grant in the set (OSFP.AU.6), and names its approver (OSFP.AU.2).
function checkDerivedGrants({ grants }) {
  const derived = grants.filter((g) => filled(g.record.derivedFrom));
  for (const d of derived) {
    const standing = grants.find((g) => g.record.id === d.record.derivedFrom);
    if (!standing || !filled(standing.record.scheduleId)) {
      ruleFail("OSFP.AU.6", d.f, "derives from a grant that is not a standing grant in the examples");
      continue;
    }
    for (const extra of beyond(d.record, standing.record)) ruleFail("OSFP.AU.6", d.f, `has ${extra}, beyond ${standing.f}`);
    if (d.record.approvedBy !== standing.record.approvedBy) ruleFail("OSFP.AU.2", d.f, `does not name the person who approved ${standing.f}`);
  }
  return derived.length;
}

// While an attempt is unknown, another attempt of its task starts only under a later grant that
// names it, approved before the new attempt's first record (OSFP.OU.5).
function checkRetryDecisions({ examples, outcomes, grantsOf, when }) {
  let checked = 0;
  for (const u of outcomes.filter((o) => o.record.state === "unknown")) {
    const since = ms(u.record.stateAt);
    const isLaterAttempt = (x) => x.record.taskId === u.record.taskId && filled(x.record.attemptId) && x.record.attemptId !== u.record.attemptId && when(x) > since;
    const later = examples.filter(isLaterAttempt);
    if (!later.length) continue;
    checked++;
    const firstRecord = Math.min(...later.map(when));
    const namesIt = (g) => list(g.record.unknownAttempts).includes(u.record.attemptId);
    const inTime = (g) => ms(g.record.approvedAt) >= since && ms(g.record.approvedAt) <= firstRecord;
    if (!grantsOf(u.record.taskId).some((g) => namesIt(g) && inTime(g))) {
      ruleFail("OSFP.OU.5", later[0].f, `is another attempt after ${u.f} became unknown, with no grant that names that attempt approved in between`);
    }
  }
  return checked;
}

// An expired limit comes with a stop request (OSFP.PR.3).
function checkStopRequests({ events, outcomes }) {
  const expired = events.filter((x) => x.record.event === "limit-expired" && filled(x.record.attemptId));
  for (const e of expired) {
    const requested = outcomes.some((o) => o.record.attemptId === e.record.attemptId && filled(o.record.stopRequestedAt));
    if (!requested) ruleFail("OSFP.PR.3", e.f, "reports an expired limit, but no outcome records a stop request");
  }
  return expired.length;
}

// A task is missed only after its start deadline, and only on its own schedule (OSFP.PR.4).
function checkMissedTasks({ events, grants, latestGrantOf }) {
  const missed = events.filter((x) => x.record.event === "overdue" && x.record.result === "missed" && filled(x.record.taskId));
  for (const e of missed) {
    const grant = latestGrantOf(e.record.taskId);
    if (!grant) {
      ruleFail("OSFP.PR.4", e.f, "reports a missed task with no grant in the examples");
      continue;
    }
    const deadline = ms(e.record.expectedAt) + 1000 * grant.record.limits?.startAckSeconds;
    if (!(deadline <= ms(e.record.occurredAt))) ruleFail("OSFP.PR.4", e.f, "reports a task as missed before its start deadline passed");
    const standing = grants.find((g) => g.record.id === grant.record.derivedFrom);
    if (standing && standing.record.scheduleId !== e.record.scheduleId) ruleFail("OSFP.PR.4", e.f, "names a schedule other than its task's standing grant");
  }
  return missed.length;
}

// An inspection task ends with a result (OSFP.PR.6).
function checkInspectionResults({ events, grantsOf }) {
  const ended = events.filter((x) => x.record.event === "ended" && filled(x.record.taskId));
  for (const e of ended) {
    const inspection = grantsOf(e.record.taskId).some((g) => g.record.inspection === true);
    if (inspection && !("result" in e.record)) ruleFail("OSFP.PR.6", e.f, "ends an inspection task without a result");
  }
  return ended.length;
}

const SET_RULES = [checkRepeats, checkGrantsFirst, checkDerivedGrants, checkRetryDecisions, checkStopRequests, checkMissedTasks, checkInspectionResults];

function checkTheSet(examples) {
  const grouped = groupExamples(examples);
  for (const rule of SET_RULES) ruleChecks += rule(grouped);
}

// ------------------------------------------------------------------ [classes]

// "`OSFP.GE.1` to `OSFP.GE.3`, `OSFP.EV.7`" → the set of IDs it names.
function expandIds(cell, cls) {
  const ids = new Set();
  for (const part of cell.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = part.match(/^`OSFP\.([A-Z]{2})\.(\d+)`(?:\s+to\s+`OSFP\.([A-Z]{2})\.(\d+)`)?$/);
    if (!m || (m[3] && m[3] !== m[1])) {
      fail("classes", `the ${cls} row has "${part}", which is not an ID or a range of IDs in one area`);
      continue;
    }
    for (let n = Number(m[2]); n <= Number(m[4] ?? m[2]); n++) ids.add(`OSFP.${m[1]}.${n}`);
  }
  return ids;
}

function checkClasses() {
  const rows = new Map();
  for (const [label, , rules = ""] of table("Conformance", "Class").rows) {
    const cls = label.toLowerCase().replace(/\s+/g, "-");
    if (rows.has(cls)) fail("classes", `the conformance table has two rows for "${cls}"`);
    rows.set(cls, expandIds(rules, cls));
  }
  const named = new Set(data.items.flatMap((it) => list(it.classes)));
  for (const cls of new Set([...named, ...rows.keys()])) {
    if (!rows.has(cls)) fail("classes", `rules name the class "${cls}", but the conformance table has no row for it`);
    if (!named.has(cls)) fail("classes", `the conformance table has a row for "${cls}", but no rule names that class`);
    const want = new Set(data.items.filter((it) => list(it.classes).includes(cls)).map((it) => it.id));
    const have = rows.get(cls) ?? new Set();
    for (const id of want) if (!have.has(id)) fail("classes", `${id} names ${cls} in standard.json, but the ${cls} row does not list it`);
    for (const id of have) if (!want.has(id)) fail("classes", `the ${cls} row lists ${id}, but standard.json does not give it that class`);
  }
  note("classes", `${rows.size} rows of the conformance table compared both ways with the classes of ${data.items.length} rules`);
}

// ------------------------------------------------------------------ [references]

function checkReferences() {
  const refs = section("References");
  const entries = new Map();
  for (const [, key, line] of refs.matchAll(/^- \[([^\]]+)\] (.+)$/gm)) {
    if (entries.has(key)) fail("references", `[${key}] has two entries in section 18`);
    entries.set(key, line);
  }
  const body = prose.replace(refs, "").replace(/`[^`\n]*`/g, "");
  const cited = new Set([...body.matchAll(/\[([A-Za-z][\w-]*)\](?!\()/g)].map((m) => m[1]));
  const byRule = new Set(data.items.flatMap((it) => list(it.citations)));

  for (const k of cited) if (!entries.has(k)) fail("references", `[${k}] is cited in the prose, but section 18 has no entry for it`);
  for (const [k, line] of entries) {
    if (!cited.has(k) && !byRule.has(k)) fail("references", `[${k}] has an entry in section 18, but neither the prose nor a rule cites it`);
    if (!/https?:\/\/\S+$/.test(line)) fail("references", `[${k}] in section 18 does not end with a URL`);
  }
  for (const b of data.bibliography) {
    const line = entries.get(b.key);
    if (!line) fail("references", `bibliography entry ${b.key} in standard.json has no entry in section 18`);
    else if (b.url && !line.endsWith(` ${b.url}`)) fail("references", `[${b.key}] in section 18 does not end with its URL in standard.json`);
    else if (b.doi && !line.includes(b.doi)) fail("references", `[${b.key}] in section 18 does not carry its DOI`);
  }
  note("references", `${cited.size} keys cited in the prose, ${entries.size} entries in section 18, ${data.bibliography.length} bibliography URLs compared`);
}

// ------------------------------------------------------------------ run

checkSchema();
const { files, examples } = readExamples();
checkExamples(examples, files);
checkEachExample(examples);
checkTheSet(examples);
note("rules", `${ruleChecks} rule checks on ${files.length} examples, one by one and as a set`);
checkClasses();
checkReferences();

console.log(`check-osfp · OSFP ${data.version}`);
let total = 0;
for (const c of ORDER) {
  const msgs = failures.get(c);
  total += msgs.length;
  if (msgs.length) for (const m of msgs) console.log(`FAIL [${c}] ${m}`);
  else console.log(`ok   [${c}] ${notes.get(c)}`);
}
console.log(`Result: ${total} violation(s) → exit ${total ? 1 : 0}`);
process.exit(total ? 1 : 0);
