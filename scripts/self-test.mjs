#!/usr/bin/env node
// self-test.mjs — proves that each check can fail. A check that cannot fail proves nothing.
//
// Each case copies this repository to a new temporary directory, makes one change, and runs one
// check against the copy. A failing case expects exit 1 and a named message on a FAIL line; a
// could-not-run case expects exit 2 and its message; a passing case expects exit 0. A clean copy
// must pass both checks. No case touches the repository itself.
//
// Every named check in both scripts has at least one case here, and so does each wrong copy
// that an adversarial review built and that passed an earlier version of the checks.
//
// Usage: node scripts/self-test.mjs
// Exit:  0 every case behaved · 1 a case did not · 2 could not run.

import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Deletes only directories this run created under the OS temp dir.
const OWN_PREFIX = join(tmpdir(), "osfp-self-test-");
const madeHere = new Set();
function makeCopy() {
  const dir = mkdtempSync(OWN_PREFIX);
  madeHere.add(dir);
  cpSync(ROOT, dir, { recursive: true, filter: (src) => !/^\.git(\/|$)/.test(relative(ROOT, src)) });
  return dir;
}
function removeCopy(dir) {
  if (!madeHere.has(dir) || !dir.startsWith(OWN_PREFIX)) throw new Error(`refusing to delete ${dir}: not a copy this run made`);
  rmSync(dir, { recursive: true, force: true });
}

// Each edit throws if it changed nothing, so a case can never pass by missing its target.
function replace(dir, path, from, to) {
  const file = join(dir, path);
  const text = readFileSync(file, "utf8");
  if (!text.includes(from)) throw new Error(`mutation missed: ${path} does not contain ${JSON.stringify(from.slice(0, 60))}`);
  writeFileSync(file, text.replace(from, to));
}
function editJson(dir, path, change) {
  const file = join(dir, path);
  const before = readFileSync(file, "utf8");
  const doc = JSON.parse(before);
  change(doc);
  const after = `${JSON.stringify(doc, null, 2)}\n`;
  if (JSON.stringify(JSON.parse(after)) === JSON.stringify(JSON.parse(before))) throw new Error(`mutation missed: ${path} is unchanged`);
  writeFileSync(file, after);
}
function remove(dir, path) {
  const file = join(dir, path);
  readFileSync(file);
  rmSync(file);
}
const addJson = (dir, path, doc) => writeFileSync(join(dir, path), `${JSON.stringify(doc, null, 2)}\n`);
const ruleText = (dir, id) => {
  const line = readFileSync(join(dir, "spec/STANDARD.md"), "utf8").split("\n").find((l) => l.startsWith(`- \`${id}\` — `));
  if (!line) throw new Error(`mutation missed: no definition of ${id}`);
  return line.slice(`- \`${id}\` — `.length);
};

const STANDARD = "check-standard.mjs";
const OSFP = "check-osfp.mjs";
const SPEC = "spec/STANDARD.md";
const DATA = "spec/standard.json";
const checksOf = (doc) => doc.predicate.checks;
const item = (doc, id) => doc.items.find((it) => it.id === id);
const U = (s) => `urn:uuid:7b0c9d62-1f3a-4c2e-9a51-${s}`;
// An ended event for the second attempt of task a1, which the examples do not include.
const endedEvent = (overrides = {}) => ({
  specversion: "1.0",
  type: "io.github.sunnypatneedi.osfp.progress.ended",
  source: "urn:example:factory",
  id: U("00000000000b"),
  time: "2026-11-11T18:15:00Z",
  data: {
    osfpVersion: "0.1.0-draft.1", recordType: "progress", id: U("00000000000c"), event: "ended", occurredAt: "2026-11-11T18:15:00Z",
    taskId: U("0000000000a1"), attemptId: U("0000000000b2"), state: "completed", ...overrides,
  },
});

// [script, case, expected message, mutation, expected exit (1 unless stated)]
const CASES = [
  // check-standard.mjs: the document against its data, one case per check.
  [STANDARD, "[version] README names another version", /\[version\]/, (d) => replace(d, "README.md", "**Version:** 0.1.0-draft.1", "**Version:** 0.1.0-draft.2")],
  [STANDARD, "[changelog] the Unreleased heading is gone", /\[changelog\]/, (d) => replace(d, "CHANGELOG.md", "## [Unreleased]\n", "")],
  [STANDARD, "[ids] two rules share an ID in the data", /\[ids\]/, (d) => editJson(d, DATA, (doc) => (item(doc, "OSFP.GE.2").id = "OSFP.GE.1"))],
  [STANDARD, "[parity] a rule is in the prose but not in the data", /\[parity\]/, (d) =>
    replace(d, SPEC, "- `OSFP.GE.6` —", "- `OSFP.GE.7` — A consumer MUST log every record it reads.\n- `OSFP.GE.6` —")],
  [STANDARD, "[text] two rules swap their text in the prose", /\[text\]/, (d) => {
    const [a, b] = [ruleText(d, "OSFP.EV.3"), ruleText(d, "OSFP.EV.10")];
    replace(d, SPEC, `\`OSFP.EV.3\` — ${a}`, `\`OSFP.EV.3\` — ${b}`);
    replace(d, SPEC, `\`OSFP.EV.10\` — ${b}`, `\`OSFP.EV.10\` — ${a}`);
  }],
  [STANDARD, "[text] a second definition contradicts the first", /\[text\].*OSFP\.OU\.4/, (d) =>
    replace(d, SPEC, "## 9. Verification evidence", "- `OSFP.OU.4` — A factory MAY record `failed` when it cannot establish what happened.\n\n## 9. Verification evidence")],
  [STANDARD, "[text] the data cuts a rule's final clause", /\[text\].*OSFP\.EV\.3/, (d) =>
    editJson(d, DATA, (doc) => (item(doc, "OSFP.EV.3").statement = item(doc, "OSFP.EV.3").statement.replace(/; skipped.*$/, "")))],
  [STANDARD, "[text] the prose adds a sentence with no key word", /\[text\].*OSFP\.AU\.4/, (d) =>
    replace(d, SPEC, "any that the grant does not list.", "any that the grant does not list. Tools that the harness already provides are not covered.")],
  [STANDARD, "[text] a rule gains an indented line", /\[text\].*OSFP\.AU\.9/, (d) =>
    replace(d, SPEC, "- `OSFP.AU.9` — A factory MUST NOT place a credential in a model's input.", "- `OSFP.AU.9` — A factory MUST NOT place a credential in a model's input.\n  This does not apply to tool results.")],
  [STANDARD, "[text] a rule's statement is gone from the data", /\[text\].*OSFP\.OU\.5/, (d) => editJson(d, DATA, (doc) => delete item(doc, "OSFP.OU.5").statement)],
  [STANDARD, "[pinned] a pinned rule disappears from prose and data together", /\[pinned\].*OSFP\.EV\.10/, (d) => {
    replace(d, SPEC, `- \`OSFP.EV.10\` — ${ruleText(d, "OSFP.EV.10")}\n`, "");
    editJson(d, DATA, (doc) => (doc.items = doc.items.filter((it) => it.id !== "OSFP.EV.10")));
  }],
  [STANDARD, "[citations] a rule cites a source the bibliography lacks", /\[citations\]/, (d) => editJson(d, DATA, (doc) => (item(doc, "OSFP.GE.1").citations = ["made-up"]))],
  [STANDARD, "[keywords] the BCP 14 paragraph is gone", /\[keywords\]/, (d) => replace(d, SPEC, "when, and only when, they appear in all capitals", "when they appear")],
  [STANDARD, "[sections] the known limitations section is renamed", /\[sections\]/, (d) => replace(d, SPEC, "## 17. Known limitations", "## 17. Caveats")],
  [STANDARD, "[links] a relative link points at a missing file", /\[links\]/, (d) => replace(d, "README.md", "## Cite", "See [the FAQ](FAQ.md).\n\n## Cite")],
  [STANDARD, "[ci] the checkout action loses its SHA pin", /\[ci\]/, (d) => replace(d, ".github/workflows/check.yml", "@3d3c42e5aac5ba805825da76410c181273ba90b1", "@v7")],

  // check-osfp.mjs [schema]: the data against its schema.
  [OSFP, "[schema] a rule gains a field the schema does not allow", /\[schema\].*priority/, (d) => editJson(d, DATA, (doc) => (item(doc, "OSFP.GE.1").priority = "high"))],
  [OSFP, "[schema] a rule loses every class", /\[schema\].*OSFP|\[schema\].*classes/, (d) => editJson(d, DATA, (doc) => (item(doc, "OSFP.EV.10").classes = []))],
  [OSFP, "[schema] the schema uses a keyword the check does not implement", /\[could-not-run\].*"maxLength"/, (d) =>
    editJson(d, "schema/standard.schema.json", (s) => (s.$defs.item.properties.statement.maxLength = 400)), 2],

  // check-osfp.mjs [examples]: each record's own fields and each field's own values.
  [OSFP, "[examples] a grant uses a field from the outcome table", /\[examples\].*"state" is not a field of the task-grant record/, (d) =>
    editJson(d, "examples/task-grant.json", (g) => (g.state = "unknown"))],
  [OSFP, "[examples] an outcome's state is a field name", /\[examples\].*"note" is not a value of "state"/, (d) =>
    editJson(d, "examples/outcome-unknown.json", (o) => (o.state = "note"))],
  [OSFP, "[examples] a check's status is a field name", /\[examples\].*"verifier" is not a value of "status"/, (d) =>
    editJson(d, "examples/verification-evidence.json", (s) => (checksOf(s)[0].status = "verifier"))],
  [OSFP, "[examples] an operation is an access value", /\[examples\].*"write" is not a value of "operations"/, (d) =>
    editJson(d, "examples/task-grant.json", (g) => (g.operations = ["start", "write"]))],
  [OSFP, "[examples] a hidden table row defines an operation", /\[examples\].*"deploy" is not a value of "operations"/, (d) => {
    replace(d, SPEC, "| `merge` |", "<!--\n| `deploy` | Deploying |\n-->\n| `merge` |");
    editJson(d, "examples/task-grant.json", (g) => g.operations.push("deploy"));
  }],
  [OSFP, "[examples] an event type leaves the maintainer's namespace", /\[examples\].*event type/, (d) =>
    editJson(d, "examples/progress-overdue.json", (e) => (e.type = "dev.osfp.progress.overdue"))],

  // check-osfp.mjs [rules]: one example at a time.
  [OSFP, "[rules] a timestamp has an offset instead of Z", /OSFP\.GE\.2/, (d) => editJson(d, "examples/task-grant.json", (g) => (g.approvedAt = "2026-11-11T18:00:00+00:00"))],
  [OSFP, "[rules] a disclosure loses its revision", /OSFP\.AU\.8/, (d) => editJson(d, "examples/task-grant.json", (g) => delete g.disclosures[0].revision)],
  [OSFP, "[rules] a grant expires before it was approved", /section 7.*expire after/, (d) =>
    editJson(d, "examples/task-grant-retry.json", (g) => (g.expiresAt = "2026-11-11T18:05:00Z"))],
  [OSFP, "[rules] evidence names the tree by a file digest", /OSFP\.EV\.1/, (d) =>
    editJson(d, "examples/verification-evidence.json", (s) => (s.subject[0].digest = { sha256: "0".repeat(64) }))],
  [OSFP, "[rules] the subject names a different tree from the checks", /OSFP\.EV\.1.*subject does not name/, (d) =>
    editJson(d, "examples/verification-evidence.json", (s) => (s.subject[0].digest = { gitTree: "f".repeat(40) }))],
  [OSFP, "[rules] a check names its tree by a file digest", /section 9.*gitTree or dirHash/, (d) =>
    editJson(d, "examples/verification-evidence.json", (s) => (checksOf(s)[0].treeAtEnd = { sha256: "0".repeat(64) }))],
  [OSFP, "[rules] a fully skipped suite reports passed", /OSFP\.EV\.3/, (d) => editJson(d, "examples/verification-evidence.json", (s) => (checksOf(s)[1].status = "passed"))],
  [OSFP, "[rules] a check passes with a failing exit status", /OSFP\.EV\.3/, (d) => editJson(d, "examples/verification-evidence.json", (s) => (checksOf(s)[0].exitStatus = 1))],
  [OSFP, "[rules] the tree changes under a passed check", /OSFP\.EV\.5/, (d) =>
    editJson(d, "examples/verification-evidence.json", (s) => (checksOf(s)[0].treeAtEnd = { gitTree: "f".repeat(40) }))],
  [OSFP, "[rules] a check changed its own test but names no path", /OSFP\.EV\.6/, (d) => editJson(d, "examples/verification-evidence.json", (s) => (checksOf(s)[0].inputsChanged = true))],
  [OSFP, "[rules] a check names a changed path but says nothing changed", /OSFP\.EV\.6/, (d) =>
    editJson(d, "examples/verification-evidence.json", (s) => (checksOf(s)[0].changedInputs = ["tests/test_widgets.py"]))],
  [OSFP, "[rules] a progress record does not name its event", /OSFP\.PR\.7/, (d) => {
    const event = JSON.parse(readFileSync(join(d, "examples/progress-overdue.json"), "utf8"));
    remove(d, "examples/progress-overdue.json");
    const { event: _, ...record } = event.data;
    addJson(d, "examples/progress-overdue.json", record);
  }],
  [OSFP, "[rules] a task is overdue before it was expected", /section 10.*before the task was expected/, (d) =>
    editJson(d, "examples/progress-overdue.json", (e) => (e.data.expectedAt = "2026-11-12T04:00:00Z"))],

  // check-osfp.mjs [rules]: across the examples.
  [OSFP, "[rules] an attempt's task has no grant", /OSFP\.AU\.1/, (d) => editJson(d, "examples/verification-evidence.json", (s) => (s.predicate.taskId = U("0000000000a3")))],
  [OSFP, "[rules] a derived grant permits more than its standing grant", /OSFP\.AU\.6.*publish/, (d) => editJson(d, "examples/task-grant-scheduled.json", (g) => g.operations.push("publish"))],
  [OSFP, "[rules] a derived grant outlives its standing grant", /OSFP\.AU\.6.*later/, (d) => editJson(d, "examples/task-grant-scheduled.json", (g) => (g.expiresAt = "2027-06-01T00:00:00Z"))],
  [OSFP, "[rules] a derived grant drops a restriction", /OSFP\.AU\.6.*restriction on network/, (d) => editJson(d, "examples/task-grant-scheduled.json", (g) => (g.restrictions = []))],
  [OSFP, "[rules] a derived grant has no expiry", /OSFP\.AU\.6.*missing expiry/, (d) => editJson(d, "examples/task-grant-scheduled.json", (g) => delete g.expiresAt)],
  [OSFP, "[rules] a derived grant derives from nothing", /OSFP\.AU\.6.*not a standing grant/, (d) =>
    editJson(d, "examples/task-grant-scheduled.json", (g) => {
      g.derivedFrom = U("0000000000ff");
      g.operations.push("merge");
    })],
  [OSFP, "[rules] a second attempt starts with no grant after the unknown", /OSFP\.OU\.5/, (d) => remove(d, "examples/task-grant-retry.json")],
  [OSFP, "[rules] the retry grant does not name the unknown attempt", /OSFP\.OU\.5/, (d) => editJson(d, "examples/task-grant-retry.json", (g) => delete g.unknownAttempts)],
  [OSFP, "[rules] the retry grant comes after the new attempt ran", /OSFP\.OU\.5/, (d) => editJson(d, "examples/task-grant-retry.json", (g) => (g.approvedAt = "2026-11-11T18:30:00Z"))],
  [OSFP, "[rules] a limit expires and nobody requests a stop", /OSFP\.PR\.3/, (d) => editJson(d, "examples/outcome-unknown.json", (o) => delete o.stopRequestedAt)],
  [OSFP, "[rules] a task is reported missed before its start deadline", /OSFP\.PR\.4/, (d) =>
    editJson(d, "examples/progress-overdue.json", (e) => (e.data.expectedAt = "2026-11-12T03:49:00Z"))],
  [OSFP, "[rules] an inspection task ends without a result", /OSFP\.PR\.6/, (d) => {
    editJson(d, "examples/task-grant.json", (g) => (g.inspection = true));
    addJson(d, "examples/progress-ended.json", endedEvent());
  }],
  [OSFP, "[rules] two events share a source and an id", /CloudEvents/, (d) => editJson(d, "examples/progress-overdue.json", (e) => (e.id = U("000000000004")))],
  [OSFP, "[rules] an ended event that completed passes", /Result: 0 violation/, (d) => addJson(d, "examples/progress-ended.json", endedEvent()), 0],

  // check-osfp.mjs [classes] and [references].
  [OSFP, "[classes] a rule loses a class in the data only", /\[classes\].*OSFP\.EV\.9/, (d) => editJson(d, DATA, (doc) => (item(doc, "OSFP.EV.9").classes = ["factory"]))],
  [OSFP, "[classes] the conformance table drops a rule", /\[classes\].*OSFP\.PR\.4/, (d) => replace(d, SPEC, "`OSFP.PR.2` to `OSFP.PR.4`", "`OSFP.PR.2`, `OSFP.PR.3`")],
  [OSFP, "[classes] the visible row drops rules and a hidden row keeps them", /\[classes\].*OSFP\.EV\.10/, (d) =>
    replace(d, SPEC, "`OSFP.EV.10` to `OSFP.EV.12`, ", "<!-- `OSFP.EV.10` to `OSFP.EV.12` -->")],
  [OSFP, "[references] the prose cites a key with no reference", /\[references\].*\[made-up\]/, (d) =>
    replace(d, SPEC, "OSFP gives those records one meaning.", "OSFP gives those records one meaning [made-up].")],
  [OSFP, "[references] a bibliography URL drifts from its reference", /\[references\].*\[sarif\]/, (d) =>
    editJson(d, DATA, (doc) => (doc.bibliography.find((b) => b.key === "sarif").url = "https://example.com/sarif"))],
  [OSFP, "[references] a reference moves and a hidden copy keeps the old one", /\[references\].*\[a2a-spec\]/, (d) =>
    replace(d, SPEC, "https://a2a-protocol.org/v1.0.1/specification/\n", "https://a2a-protocol.org/v0.3.0/specification/\n<!-- - [a2a-spec] \"A2A\". https://a2a-protocol.org/v1.0.1/specification/ -->\n")],
];

function run(script, dir) {
  const r = spawnSync(process.execPath, [join(ROOT, "scripts", script), "--root", dir], { encoding: "utf8" });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

// The line that each expected exit code is judged by.
const MARKERS = { 0: "Result:", 1: "FAIL", 2: "[could-not-run]" };

// Why a case misbehaved, or "" if it behaved.
function misbehavior(r, code, expected, dir) {
  if (r.out.includes(dir)) return "the output names the temporary directory";
  if (r.code !== code) return `exit ${r.code}, expected ${code}`;
  const lines = r.out.split("\n").filter((line) => line.trimStart().startsWith(MARKERS[code])).join("\n");
  return expected.test(lines) ? "" : `no ${MARKERS[code]} line matched ${expected}`;
}

let bad = 0;
const report = (ok, name, why = "") => {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${why ? `: ${why}` : ""}`);
};

try {
  const clean = makeCopy();
  for (const script of [STANDARD, OSFP]) {
    const r = run(script, clean);
    report(r.code === 0, `control: ${script} passes on a clean copy`, r.code === 0 ? "" : `exit ${r.code}\n${r.out}`);
  }
  removeCopy(clean);

  for (const [script, name, expected, mutate, code = 1] of CASES) {
    const dir = makeCopy();
    mutate(dir);
    const why = misbehavior(run(script, dir), code, expected, dir);
    report(!why, `${script} ${name}`, why);
    removeCopy(dir);
  }
} catch (e) {
  console.error(`[could-not-run] ${e.message}`);
  process.exit(2);
}

const total = CASES.length + 2;
console.log(`${total} cases, ${total - bad} behaved → exit ${bad ? 1 : 0}`);
process.exit(bad ? 1 : 0);
