#!/usr/bin/env node
// check-standard.mjs — zero-dependency checker for a standard repository.
//
// Usage:  node check-standard.mjs [--root <dir>] [--config <file>]
//         --root defaults to the current directory.
//         --config defaults to standard.config.json under --root.
// Exit:   0 pass (warnings allowed) · 1 one or more violations · 2 could not run.
//         "The gate says no" (1) and "the gate did not run" (2) are different facts.
//
// Every failure line names its check in brackets, so the fix is mechanical.
//
// Checks
//   [version]    one version string agrees across STANDARD.md, the data file and README
//   [changelog]  CHANGELOG has an [Unreleased] heading and a heading for the current version
//   [ids]        every ID in the data file is well-formed and unique, and there is at least one
//   [parity]     prose and data hold the same IDs, compared both ways
//   [text]       each configured text field matches the one prose line that defines its ID.
//                A definition line starts with the ID. A second definition, a key word the
//                data text lacks, or a key word beside the ID anywhere else also fails.
//                Text found somewhere else in the prose does not count.
//   [pinned]     IDs pinned by hand in the config exist in prose and data
//   [citations]  every item has introducedIn; items new in this version cite a bibliography
//                entry with a DOI or URL; declared gaps fail unless the config allows them
//   [keywords]   uppercase BCP 14 key words appear only with the BCP 14 declaration
//   [sections]   the prose has every required section heading
//   [links]      relative Markdown links resolve to files that exist
//   [ci]         workflow actions are pinned to full commit SHAs, and a workflow runs this checker
//
// What this cannot check, by construction. It prints this list on every run:
//   1. An item removed from prose and data in the same change. There is no baseline.
//      Pin IDs that must not disappear in config.pinnedIds.
//   2. Whether a DOI or URL is real, or supports the claim. This script never goes online.
//   3. External links. They are listed for a human to open.
//   4. Whether the text is clear, correct, in scope, or fair. That is review.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

// Output names files relative to --root, never by absolute path, so it is safe to paste
// into a public pull request. Set CHECK_STANDARD_DEBUG=1 for a stack trace.
process.on("uncaughtException", (e) => {
  const detail = process.env.CHECK_STANDARD_DEBUG && e && e.stack ? e.stack : (e && e.message) || e;
  console.error(`[could-not-run] internal error: ${detail}`);
  process.exit(2);
});

const BCP14_RE =
  /\b(?:MUST NOT|MUST|REQUIRED|SHALL NOT|SHALL|SHOULD NOT|SHOULD|NOT RECOMMENDED|RECOMMENDED|MAY|OPTIONAL)\b/g;
const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const SHA_PIN_RE = /@[0-9a-f]{40}$/;
const LINK_RE = /!?\[[^\]\n]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"'\n]*["'])?\s*\)/g;

const DEFAULT_SECTIONS = {
  scope: "^(?:[0-9.]+\\s+)?scope\\b",
  "out of scope": "out of scope|non-goals|is not\\b",
  conventions: "conventions|notation|requirements language",
  conformance: "conformance",
  versioning: "versioning|stability|compatibility",
  "privacy and security": "privacy|security",
  terminology: "terminology|glossary|definitions",
  references: "references|bibliography",
  "known limitations": "limitations",
};

const DEFAULTS = {
  sourceDir: "spec",
  prose: "STANDARD.md",
  data: "standard.json",
  readme: "README.md",
  changelog: "CHANGELOG.md",
  idKeys: ["id"],
  textFields: [],
  pinnedIds: [],
  proseOnlyIds: [],
  localIdPattern: null,
  unprefixedPattern: null,
  versionPattern: "^\\*\\*Version:\\*\\*\\s*([0-9A-Za-z.+-]+)",
  requiredSections: DEFAULT_SECTIONS,
  citations: { required: true, allowDeclaredGaps: false },
  linkExclude: ["node_modules", ".git", "dist", "build", "coverage"],
  workflowsDir: ".github/workflows",
};

const CANNOT_CHECK = [
  "An item removed from prose and data in the same change. There is no baseline; pin IDs that must not disappear in config.pinnedIds.",
  "Whether a DOI or URL is real, or supports the claim. This script never goes online.",
  "External links. They are listed above for a human to open.",
  "Whether the text is clear, correct, in scope, or fair. That is review.",
];

const ORDER = ["version", "changelog", "ids", "parity", "text", "pinned", "citations", "keywords", "sections", "links", "ci"];

// ------------------------------------------------------------------ setup

function cannotRun(msg) {
  console.error(`[could-not-run] ${msg}`);
  process.exit(2);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--root" || a === "--config") {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) cannotRun(`${a} needs a value`);
      out[a.slice(2)] = v;
      i++;
    } else cannotRun(`unknown argument: ${a}`);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log("usage: node check-standard.mjs [--root <dir>] [--config <file>]\nexit: 0 pass · 1 violations · 2 could not run");
  process.exit(0);
}

const ROOT = resolve(args.root ?? ".");
const CONFIG_PATH = resolve(ROOT, args.config ?? "standard.config.json");
const rel = (p) => relative(ROOT, p) || ".";

function readText(path, label) {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    return cannotRun(`cannot read ${label} at ${rel(path)}: ${e.code ?? e.message}`);
  }
}

function readJson(path, label) {
  const text = readText(path, label);
  try {
    return JSON.parse(text);
  } catch (e) {
    return cannotRun(`${label} at ${rel(path)} is not valid JSON: ${e.message}`);
  }
}

function compile(pattern, flags, label) {
  if (typeof pattern !== "string" || !pattern) cannotRun(`config.${label} must be a non-empty string`);
  try {
    return new RegExp(pattern, flags);
  } catch (e) {
    return cannotRun(`config.${label} is not a valid regular expression: ${e.message}`);
  }
}

const userConfig = readJson(CONFIG_PATH, "config");
if (!userConfig || typeof userConfig !== "object" || Array.isArray(userConfig)) cannotRun("config must be a JSON object");
const cfg = {
  ...DEFAULTS,
  ...userConfig,
  citations: { ...DEFAULTS.citations, ...(userConfig.citations ?? {}) },
};
if (!userConfig.idPattern) cannotRun('config.idPattern is required, for example "ABC\\\\.[A-Z]{2}\\\\.[0-9]+"');
for (const key of ["idKeys", "textFields", "pinnedIds", "proseOnlyIds", "linkExclude"]) {
  if (!Array.isArray(cfg[key])) cannotRun(`config.${key} must be an array`);
}

const ID_FULL = compile(`^(?:${cfg.idPattern})$`, "", "idPattern");
const ID_SCAN = compile(`(?<![A-Za-z0-9.])(?:${cfg.idPattern})(?![A-Za-z0-9])`, "g", "idPattern");
const VERSION_RE = compile(cfg.versionPattern, "m", "versionPattern");
const UNPREFIXED = cfg.unprefixedPattern ? compile(cfg.unprefixedPattern, "g", "unprefixedPattern") : null;
// Opt-in, for audits of existing standards whose data mixes qualified IDs with local keys
// (for example a dimension node with id "DF" and anchor "ABC.S.DF"). Off by default: strict.
const LOCAL_ID = cfg.localIdPattern ? compile(`^(?:${cfg.localIdPattern})$`, "", "localIdPattern") : null;
if (!cfg.requiredSections || typeof cfg.requiredSections !== "object") cannotRun("config.requiredSections must be an object");
const SECTION_RES = Object.entries(cfg.requiredSections).map(([name, p]) => [name, compile(p, "i", `requiredSections.${name}`)]);

const SRC = resolve(ROOT, cfg.sourceDir);
const PROSE_PATH = join(SRC, cfg.prose);
const DATA_PATH = join(SRC, cfg.data);
const README_PATH = resolve(ROOT, cfg.readme);
const CHANGELOG_PATH = resolve(ROOT, cfg.changelog);

// Comments and fenced code are blanked, not deleted, so line numbers stay true.
const blank = (m) => m.replace(/[^\n]/g, " ");
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, blank);
const stripFences = (s) => s.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, blank);

const prose = stripComments(readText(PROSE_PATH, "prose"));
const data = readJson(DATA_PATH, "data file");
if (!data || typeof data !== "object" || Array.isArray(data)) cannotRun("the data file must hold a JSON object");

// ------------------------------------------------------------------ results

const results = new Map();
const bucket = (c) => {
  if (!results.has(c)) results.set(c, { fails: [], warns: [], notes: [] });
  return results.get(c);
};
const fail = (c, m) => bucket(c).fails.push(m);
const warn = (c, m) => bucket(c).warns.push(m);
const note = (c, m) => bucket(c).notes.push(m);

function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}
const trunc = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const coreVersion = (v) => /^(\d+\.\d+\.\d+)/.exec(v ?? "")?.[1];
const norm = (s) =>
  s
    .replace(/[*_`]/g, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

// ------------------------------------------------------------------ checks

function checkVersion() {
  const c = "version";
  const seen = [];
  const proseV = prose.match(VERSION_RE)?.[1];
  if (!proseV) fail(c, `${rel(PROSE_PATH)} has no line matching versionPattern`);
  seen.push([rel(PROSE_PATH), proseV]);
  const dataV = typeof data.version === "string" ? data.version : undefined;
  if (!dataV) fail(c, `${rel(DATA_PATH)} has no top-level "version" string`);
  seen.push([rel(DATA_PATH), dataV]);
  if (existsSync(README_PATH)) {
    const readmeV = stripComments(readFileSync(README_PATH, "utf8")).match(VERSION_RE)?.[1];
    if (!readmeV) fail(c, `${rel(README_PATH)} states no version; repo-level claims must name the released version`);
    seen.push([rel(README_PATH), readmeV]);
  } else fail(c, `${rel(README_PATH)} not found`);
  const values = new Set(seen.map(([, v]) => v).filter(Boolean));
  if (values.size > 1) fail(c, `versions disagree: ${seen.map(([f, v]) => `${f}=${v ?? "none"}`).join(", ")}`);
  const version = dataV ?? proseV;
  if (version && !SEMVER_RE.test(version)) fail(c, `"${version}" is not a Semantic Versioning 2.0.0 version`);
  const found = seen.filter(([, v]) => v).map(([f]) => f);
  note(c, `${version ?? "no version"} read from ${found.length ? found.join(", ") : "nowhere"}`);
  return version;
}

function checkChangelog(version) {
  const c = "changelog";
  if (!existsSync(CHANGELOG_PATH)) {
    fail(c, `${rel(CHANGELOG_PATH)} not found`);
    note(c, "no changelog to read");
    return;
  }
  const text = readFileSync(CHANGELOG_PATH, "utf8");
  if (!/^##\s*\[Unreleased\]/im.test(text)) fail(c, 'no "## [Unreleased]" heading');
  if (version && !new RegExp(`^##\\s*\\[${escapeRe(version)}\\]`, "m").test(text)) {
    fail(c, `no "## [${version}]" heading for the current version`);
  }
  note(c, `looked for [Unreleased] and [${version ?? "?"}] headings in ${rel(CHANGELOG_PATH)}`);
}

let localKeys = 0;
function collectItems() {
  const items = [];
  const walk = (node, path) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    if (!node || typeof node !== "object") return;
    for (const k of cfg.idKeys) {
      if (typeof node[k] !== "string") continue;
      if (LOCAL_ID && LOCAL_ID.test(node[k])) {
        localKeys++;
        continue;
      }
      items.push({ id: node[k], node, path });
    }
    for (const [k, v] of Object.entries(node)) {
      if (path === "$" && k === "bibliography") continue;
      if (v && typeof v === "object") walk(v, `${path}.${k}`);
    }
  };
  walk(data, "$");
  return items;
}

function checkIds(items) {
  const c = "ids";
  const byId = new Map();
  for (const it of items) {
    if (!ID_FULL.test(it.id)) fail(c, `malformed ID "${it.id}" at ${it.path} (idPattern ${cfg.idPattern})`);
    if (!byId.has(it.id)) byId.set(it.id, []);
    byId.get(it.id).push(it.path);
  }
  for (const [id, paths] of byId) if (paths.length > 1) fail(c, `duplicate ID ${id} at ${paths.join(", ")}`);
  if (items.length === 0) {
    fail(c, `no IDs found in ${rel(DATA_PATH)} under keys [${cfg.idKeys.join(", ")}]; a check over nothing proves nothing`);
  }
  const local = LOCAL_ID ? `; ${localKeys} local keys ignored by localIdPattern` : "";
  note(c, `${items.length} IDs read from ${rel(DATA_PATH)}, ${byId.size} unique${local}`);
  return new Set(byId.keys());
}

function proseIdHits() {
  const hits = new Map();
  for (const m of prose.matchAll(ID_SCAN)) if (!hits.has(m[0])) hits.set(m[0], lineOf(prose, m.index));
  return hits;
}

function checkParity(dataIds, proseHits) {
  const c = "parity";
  const allowed = new Set(cfg.proseOnlyIds);
  for (const id of dataIds) if (!proseHits.has(id)) fail(c, `${id} is in ${rel(DATA_PATH)} but not in ${rel(PROSE_PATH)}`);
  for (const [id, line] of proseHits) {
    if (!dataIds.has(id) && !allowed.has(id)) fail(c, `${id} is in ${rel(PROSE_PATH)}:${line} but not in ${rel(DATA_PATH)}`);
  }
  let sweep = "";
  if (UNPREFIXED) {
    const masked = prose.replace(ID_SCAN, (m) => " ".repeat(m.length));
    let count = 0;
    for (const m of masked.matchAll(UNPREFIXED)) {
      count++;
      warn(c, `possible unprefixed or templated reference "${m[0]}" at ${rel(PROSE_PATH)}:${lineOf(masked, m.index)}`);
    }
    sweep = `; unprefixed sweep found ${count}`;
  } else warn(c, "no unprefixedPattern; references that drop the prefix go unseen");
  note(c, `${dataIds.size} data IDs and ${proseHits.size} prose IDs compared both ways${sweep}`);
}

// Split prose into blocks: a heading, a table row, a list item with its continuation
// lines, or a paragraph. A block whose first token is an ID defines that ID. The first
// token is read after list, table, heading, and quote markers and emphasis. A heading
// that defines an ID owns the blocks under it, up to the next heading or definition.
const BLOCK_START = /^\s*(?:>\s*)*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|\|)/;
const HEADING = /^\s*(?:>\s*)*#{1,6}\s/;
const TABLE_ROW = /^\s*(?:>\s*)*\|/;
const LEAD = /^\s*(?:>\s*)*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|\|\s*)?[*_`\s]*/;
const ID_AT_START = compile(`^(?:${cfg.idPattern})(?![A-Za-z0-9])`, "", "idPattern");
const keywordCount = (s) => (s.match(BCP14_RE) ?? []).length;
const idAtStart = (line) => ID_AT_START.exec(line.slice(LEAD.exec(line)[0].length))?.[0] ?? null;
const idsIn = (text) => [...new Set([...text.matchAll(ID_SCAN)].map((m) => m[0]))];
const where = (line) => `${rel(PROSE_PATH)}:${line}`;

function proseBlocks(text) {
  const blocks = [];
  let open = null; // the block that a continuation line joins, if any
  text.split("\n").forEach((line, i) => {
    if (!line.trim()) {
      open = null;
      return;
    }
    if (open && !BLOCK_START.test(line)) {
      open.lines.push(line);
      return;
    }
    const heading = HEADING.test(line);
    const block = { line: i + 1, lines: [line], heading, defines: idAtStart(line) };
    blocks.push(block);
    // A heading or a table row is one line. A list item or a paragraph may continue.
    open = heading || TABLE_ROW.test(line) ? null : block;
  });
  return blocks;
}

// The blocks a definition owns: its own block, and for a defining heading, the blocks
// under it up to the next heading or definition.
function extentOf(blocks, i) {
  const extent = [blocks[i]];
  if (!blocks[i].heading) return extent;
  for (let j = i + 1; j < blocks.length && !blocks[j].heading && !blocks[j].defines; j++) extent.push(blocks[j]);
  return extent;
}

// Maps each ID to its definition sites, and collects every block a definition owns.
function collectDefinitions(blocks) {
  const defs = new Map();
  const owned = new Set();
  blocks.forEach((b, i) => {
    if (!b.defines) return;
    const extent = extentOf(blocks, i);
    for (const x of extent) owned.add(x);
    const site = { line: b.line, text: norm(extent.map((x) => x.lines.join(" ")).join(" ")) };
    defs.set(b.defines, [...(defs.get(b.defines) ?? []), site]);
  });
  return { defs, owned };
}

// The item's configured text fields, as [field, value] pairs. A field that is not a string fails.
function textFieldsOf(it) {
  const texts = [];
  for (const f of cfg.textFields) {
    const v = it.node[f];
    if (v === undefined) continue;
    if (typeof v === "string") texts.push([f, v]);
    else fail("text", `${it.id}.${f} is not a string`);
  }
  return texts;
}

// Compares one item's text with each site that defines its ID. Returns how many
// field-and-site pairs it compared.
function compareWithDefinitions(it, texts, sites) {
  const c = "text";
  if (!sites.length) {
    fail(c, `${it.id} has no definition in ${rel(PROSE_PATH)}: no line starts with the ID, so its text is bound to nothing`);
    return 0;
  }
  if (sites.length > 1) {
    fail(c, `${it.id} is defined ${sites.length} times (${sites.map((s) => where(s.line)).join(", ")}); state each rule once`);
  }
  const allowed = texts.reduce((n, [, v]) => n + keywordCount(v), 0);
  for (const s of sites) {
    for (const [f, v] of texts) {
      if (!s.text.includes(norm(v))) {
        fail(c, `${it.id}.${f} does not match the definition at ${where(s.line)}; data says "${trunc(v, 90)}"`);
      }
    }
    const found = keywordCount(s.text);
    if (found > allowed) {
      fail(c, `the definition of ${it.id} at ${where(s.line)} has ${found} BCP 14 key word(s); its data text has ${allowed}`);
    }
  }
  return sites.length * texts.length;
}

// A key word beside an ID outside that ID's definition restates the rule, and a
// restatement can contradict it. Returns how many blocks it failed.
function failRestatements(blocks, owned, dataIds) {
  let restated = 0;
  for (const b of blocks) {
    if (owned.has(b)) continue;
    const text = b.lines.join(" ");
    const kw = text.match(BCP14_RE)?.[0];
    if (!kw) continue;
    const ids = idsIn(text).filter((id) => dataIds.has(id));
    if (!ids.length) continue;
    restated++;
    fail(
      "text",
      `${where(b.line)} uses the key word "${kw}" beside ${ids.join(", ")} but is not ` +
        "a definition; state each rule once, at its ID, and refer to it without key words",
    );
  }
  return restated;
}

function checkText(items, dataIds) {
  const c = "text";
  if (!cfg.textFields.length) {
    warn(c, "no textFields configured; prose and data could say different things and this would stay green");
    note(c, "0 text fields compared");
    return;
  }
  const blocks = proseBlocks(stripFences(prose));
  const { defs, owned } = collectDefinitions(blocks);
  let compared = 0;
  for (const it of items) {
    const texts = textFieldsOf(it);
    if (texts.length) compared += compareWithDefinitions(it, texts, defs.get(it.id) ?? []);
  }
  const restated = failRestatements(blocks, owned, dataIds);
  note(
    c,
    `${compared} text fields (${cfg.textFields.join(", ")}) matched against their ID's own definition; ` +
      `${defs.size} definitions found; ${restated} restatement(s) with key words`,
  );
}

function checkPinned(dataIds, proseHits) {
  const c = "pinned";
  for (const id of cfg.pinnedIds) {
    if (!dataIds.has(id)) fail(c, `pinned ID ${id} is missing from ${rel(DATA_PATH)}`);
    if (!proseHits.has(id)) fail(c, `pinned ID ${id} is missing from ${rel(PROSE_PATH)}`);
  }
  if (!cfg.pinnedIds.length) warn(c, "no pinnedIds; an ID deleted from prose and data together would go unnoticed");
  note(c, `${cfg.pinnedIds.length} pinned IDs checked`);
}

function checkCitations(items, version) {
  const c = "citations";
  if (!cfg.citations.required) {
    warn(c, "citations.required is false; sources are not checked");
    note(c, "skipped by config");
    return;
  }
  const keys = new Map();
  const bib = data.bibliography;
  if (!Array.isArray(bib)) fail(c, `${rel(DATA_PATH)} has no top-level "bibliography" array`);
  else {
    bib.forEach((e, i) => {
      if (!e || typeof e.key !== "string" || !e.key) {
        fail(c, `bibliography[${i}] has no key`);
        return;
      }
      if (keys.has(e.key)) fail(c, `duplicate bibliography key ${e.key}`);
      keys.set(e.key, e);
      if (!e.doi && !e.url) fail(c, `bibliography entry ${e.key} has neither doi nor url`);
    });
  }
  const core = coreVersion(version);
  const used = new Set();
  const gaps = [];
  let fresh = 0;
  for (const it of items) {
    const n = it.node;
    if (typeof n.introducedIn !== "string" || !n.introducedIn) {
      fail(c, `${it.id} has no introducedIn, so the gate cannot tell whether it is new`);
      continue;
    }
    const cites = Array.isArray(n.citations) ? n.citations : [];
    for (const k of cites) {
      used.add(k);
      if (!keys.has(k)) fail(c, `${it.id} cites unknown bibliography key "${k}"`);
    }
    if (!core || coreVersion(n.introducedIn) !== core) continue;
    fresh++;
    if (cites.length) continue;
    const todo = typeof n.citationsTodo === "string" ? n.citationsTodo.trim() : "";
    if (!todo) fail(c, `${it.id} is new in ${core} and cites nothing`);
    else {
      gaps.push(it.id);
      if (!cfg.citations.allowDeclaredGaps) fail(c, `${it.id} declares a gap ("${trunc(todo, 60)}"); public releases cite it or cut it`);
    }
  }
  for (const k of keys.keys()) if (!used.has(k)) warn(c, `bibliography entry ${k} is cited by no item`);
  note(
    c,
    `${items.length} items checked for introducedIn; ${fresh} new in ${core ?? "?"}; ` +
      `${gaps.length} declared gap(s)${gaps.length ? ` (${gaps.join(", ")})` : ""}; ` +
      `${keys.size} sources checked for a DOI or URL, presence only`,
  );
}

function checkKeywords() {
  const c = "keywords";
  const text = stripFences(prose);
  const hits = [...text.matchAll(BCP14_RE)];
  const declared = /BCP\s*14/.test(text) && /only when,? they appear in all capitals/i.test(text);
  if (hits.length && !declared) {
    fail(
      c,
      `${hits.length} uppercase key words (first "${hits[0][0]}" at ${rel(PROSE_PATH)}:${lineOf(text, hits[0].index)}) ` +
        "but no BCP 14 declaration; add the RFC 8174 boilerplate",
    );
  }
  note(c, `${hits.length} uppercase key words; BCP 14 declaration ${declared ? "present" : "absent"}`);
}

function checkSections() {
  const c = "sections";
  const headings = [];
  for (const line of stripFences(prose).split("\n")) {
    const m = /^#{1,6}\s+(.*)$/.exec(line);
    if (m) headings.push(m[1].trim());
  }
  for (const [name, re] of SECTION_RES) {
    if (!headings.some((h) => re.test(h))) fail(c, `no heading for "${name}" (pattern /${re.source}/i)`);
  }
  note(c, `${SECTION_RES.length} required sections looked for among ${headings.length} headings`);
}

function markdownFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (cfg.linkExclude.includes(e.name)) continue;
    if (e.name.startsWith(".") && e.name !== ".github") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) markdownFiles(p, out);
    else if (e.isFile() && /\.md$/i.test(e.name)) out.push(p);
  }
  return out;
}

function checkLinks() {
  const c = "links";
  const files = markdownFiles(ROOT);
  const external = new Set();
  let local = 0;
  for (const f of files) {
    const text = stripFences(stripComments(readFileSync(f, "utf8")));
    for (const m of text.matchAll(LINK_RE)) {
      const target = m[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) {
        if (/^https?:/i.test(target)) external.add(target);
        continue;
      }
      if (target.startsWith("#")) continue;
      const path = target.split("#")[0].split("?")[0];
      if (!path) continue;
      local++;
      let decoded = path;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        // keep the raw path
      }
      const abs = decoded.startsWith("/") ? join(ROOT, decoded) : resolve(dirname(f), decoded);
      if (!existsSync(abs)) fail(c, `${rel(f)}:${lineOf(text, m.index)} links to ${target}, which does not exist`);
    }
  }
  note(c, `${local} relative links in ${files.length} Markdown files resolved; ${external.size} external links NOT checked (offline)`);
  return [...external];
}

function checkCi() {
  const c = "ci";
  const dir = resolve(ROOT, cfg.workflowsDir);
  if (!existsSync(dir)) {
    warn(c, `no ${rel(dir)}; nothing runs this checker on push`);
    note(c, "0 workflow files");
    return;
  }
  const files = readdirSync(dir).filter((n) => /\.ya?ml$/i.test(n));
  let uses = 0;
  let runsChecker = false;
  for (const n of files) {
    const text = readFileSync(join(dir, n), "utf8");
    if (/check-standard\.mjs/.test(text)) runsChecker = true;
    text.split("\n").forEach((line, i) => {
      const m = /^\s*(?:-\s*)?uses:\s*["']?([^\s"'#]+)/.exec(line);
      if (!m) return;
      const ref = m[1];
      if (ref.startsWith("./") || ref.startsWith("docker://")) return;
      uses++;
      if (!SHA_PIN_RE.test(ref)) fail(c, `${rel(join(dir, n))}:${i + 1} uses ${ref}; pin it to a full 40-character commit SHA`);
    });
  }
  if (!runsChecker) warn(c, `no workflow in ${rel(dir)} runs check-standard.mjs`);
  note(c, `${uses} action references in ${files.length} workflow files checked for SHA pins`);
}

// ------------------------------------------------------------------ run

const version = checkVersion();
checkChangelog(version);
const items = collectItems();
const dataIds = checkIds(items);
const proseHits = proseIdHits();
checkParity(dataIds, proseHits);
checkText(items, dataIds);
checkPinned(dataIds, proseHits);
checkCitations(items, version);
checkKeywords();
checkSections();
const external = checkLinks();
checkCi();

const name = cfg.standard ?? data.standard ?? "standard";
console.log(`check-standard · ${name} ${version ?? "(no version)"}`);
let failures = 0;
let warnings = 0;
for (const c of ORDER) {
  const r = results.get(c) ?? { fails: [], warns: [], notes: [] };
  console.log(`${r.fails.length ? "FAIL" : "ok  "} [${c}] ${r.notes.join("; ") || "ran"}`);
  for (const m of r.fails) console.log(`     FAIL [${c}] ${m}`);
  for (const m of r.warns) console.log(`     WARN [${c}] ${m}`);
  failures += r.fails.length;
  warnings += r.warns.length;
}
if (external.length) {
  console.log(`\nExternal links to open by hand (${external.length}):`);
  for (const u of external.slice(0, 25)) console.log(`  ${u}`);
  if (external.length > 25) console.log(`  … and ${external.length - 25} more`);
}
console.log("\nNot checked, by construction:");
CANNOT_CHECK.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
console.log(`\nResult: ${failures} violation(s), ${warnings} warning(s) → exit ${failures ? 1 : 0}`);
process.exit(failures ? 1 : 0);
