# Editing rules

These rules bind every editor, human or AI. They live in the repository, committed, so every contributor sees the same rules.

## Style

- Write each requirement as one observable statement. "Names one tradeoff and the evidence for it" beats "demonstrates judgment."
- Plain enough for the least expert reader. Precise enough to cite.
- One term per idea. Define each term once, in Terminology, and use it the same way everywhere.
- Use uppercase key words only as BCP 14 defines them.
- Read each item alone, with no other item in view. Try to satisfy it without doing what it asks. If you can, tighten it.
- An item earns its place only if some evidence satisfies it and no other item.

## IDs

- Format: `OSFP.<area>.<n>`. Two capital letters for the area, then a number.
- Never rename an ID. Never reuse a retired ID. To change meaning, set `deprecatedIn` and `replacedBy`, and add a new ID.
- Every item carries `introducedIn`.

## Versions

| Change | Bump |
|---|---|
| Changes no rule's meaning; valid records stay valid | patch |
| An optional field, a rule that binds only that field, an example, or a crosswalk | minor |
| A rename or a removal; a narrower, looser, or new rule; a new required field | major (before 1.0: minor, with a CHANGELOG callout) |

Break a conformance requirement once, in one version, with a migration note. Tag every release when it ships.

## Evidence

- Cite every substantive claim to a primary source, with a DOI or URL.
- Never invent a citation. If you cannot verify one, mark it `TODO(cite)` and tell the owner.
- A public release carries no declared gaps. Cite it or cut it.
- Report each source at its real strength, including evidence against you.

## Scope

- Every out-of-scope topic names the standard to defer to.
- When a request crosses the scope line, propose a crosswalk instead, or ask the owner.
- Keep marketing, product names, and vendor placement out of the standard.

## Every change

- [ ] Prose, data, examples, and CHANGELOG changed in one commit.
- [ ] `node scripts/check-standard.mjs`, `node scripts/check-osfp.mjs`, and `node scripts/self-test.mjs` exit 0. Read their summary lines, not only the exit codes.
- [ ] After any batch edit, re-read the committed files. Do not trust a script's exit code alone.
- [ ] The version bump matches the table above.
- [ ] README and any site describe the released version only.

## Stop and ask the owner

A breaking change. A scope change. A license or governance change. A citation you cannot verify. A request to rename an ID.

## Publication gate

Before the first public release, all of these hold:
- [ ] The name is chosen and checked for collisions.
- [ ] Licenses are chosen for the prose and for the code and schemas, and LICENSE files are added.
- [ ] Maintainers are named, and the contribution URL resolves.
- [ ] `allowDeclaredGaps` is false in `standard.config.json`, and the checker is green locally and in CI.
- [ ] The condition for leaving draft in GOVERNANCE.md holds. If it does not, the release says "draft".
- [ ] VERIFICATION.md has a dated entry for this release.
