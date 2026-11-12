# Open Software Factory Profile (OSFP)

**Version:** 0.1.0-draft.1
**Status:** Draft. Not adopted. No outside review yet.
**License:** [Apache License 2.0](LICENSE), for the prose, the schemas, the examples, and the code.

OSFP gives the records of an agent-driven software factory one meaning: what a task may touch, what happened to an attempt (including when nobody knows), what was checked and whether it passed, and when to stop waiting. It profiles UHP, MCP, A2A, in-toto, CloudEvents, and OpenTelemetry, and adds four records that none of them define:

| Record | What it settles |
|---|---|
| Task grant | The authority a task runs under, approved by a person. A request, an instruction, a skill, or a tool listing is never authority |
| Outcome | What happened to an attempt, including `unknown`. While an attempt is unknown, no other attempt starts until a person approves again |
| Verification evidence | An in-toto predicate. No pass without an examined unit. Model text is never evidence |
| Progress | Time limits enforced by a timer outside the loop it watches. A scheduled task that never started is reported, not silent |

**Why it exists.** The standards beneath a factory stop short of these meanings, so each factory defines them itself. Public sources show where that goes wrong: a restriction can be only an instruction (UHP), an agent can rewrite the check that judges it (METR), and a client that timed out cannot tell whether its request ran (the Idempotency-Key draft). And pytest 9.0.2 exits 0 when every test is skipped, so a pass can come from a suite that ran no tests. See the [need statement](NEED.md).

## Read

- [The standard](spec/STANDARD.md) and its [machine-readable encoding](spec/standard.json), which a [JSON Schema](schema/standard.schema.json) describes
- [Examples](examples/) of each record, which tell two short stories. They are informative, not normative
- [Need statement](NEED.md) · [Design lessons](DESIGN-LESSONS.md) · [Verification record](VERIFICATION.md) · [Review records](reviews/)
- [Changelog](CHANGELOG.md) · [Governance](GOVERNANCE.md) · [Contributing](CONTRIBUTING.md) · [Editing rules](EDITING.md) · [Proposal template](proposals/0000-template.md)

## Check

```
node scripts/check-standard.mjs   # the standard against its data
node scripts/check-osfp.mjs       # the schema, examples, conformance table, and references
node scripts/self-test.mjs        # proves that each check can fail
```

Zero dependencies. Runs on Node.js 22 or later. Exit 0 means pass, 1 means violations, 2 means the check could not run. Read the summary lines, not only the exit code. Change a check on purpose, in its own commit.

## Cite

Open Software Factory Profile (OSFP), version 0.1.0-draft.1, 2026. Cite the git tag of the release you used.
