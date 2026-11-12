# Open Software Factory Profile (OSFP)

**Version:** 0.1.0-draft.1
**Status:** Draft. Not adopted. No outside review yet.
**License:** Not chosen yet. The owner chooses before the first release; see the publication gate in [EDITING.md](EDITING.md).

OSFP lets the parts of an agent-driven software factory agree on what a record means: what a task may touch, what happened to an attempt (including when nobody knows), what was checked and whether it passed, and when to stop waiting. It profiles UHP, MCP, A2A, in-toto, CloudEvents, and OAuth 2.0, and adds four records none of them define.

**Why it exists.** The standards beneath a factory stop short of these meanings, so each factory defines them itself. Public sources document what can go wrong in that gap: a restriction that was only an instruction, a pass from a suite that ran no tests, a check that the agent rewrote, and an unknown result treated as a failure and run again. See the [need statement](NEED.md).

## Read

- [The standard](spec/STANDARD.md) and its [machine-readable encoding](spec/standard.json). A [JSON Schema](schema/standard.schema.json) describes the encoding; no check runs it yet
- [Changelog](CHANGELOG.md) · [Governance](GOVERNANCE.md) · [Contributing](CONTRIBUTING.md) · [Editing rules](EDITING.md)
- [Need statement](NEED.md) · [Design lessons](DESIGN-LESSONS.md) · [Verification record](VERIFICATION.md)
- [Examples](examples/) of each record. They are informative, not normative
- [Proposal template](proposals/0000-template.md)

## Check

```
node scripts/check-standard.mjs
node scripts/check-examples.mjs
```

The first checks the standard against its data file. The second checks that every example uses only fields and values the standard defines. Zero dependencies. Exit 0 means pass, 1 means violations, 2 means it could not run. Read the summary lines, not only the exit code. Change the checker on purpose, in its own commit.

## Cite

Open Software Factory Profile (OSFP), version 0.1.0-draft.1, 2026. Cite the git tag of the release you used.
