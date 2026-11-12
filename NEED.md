# Need statement — Open Software Factory Profile

**Date:** 2026-11-11
**Decision:** build, as a profile of existing standards. Owner decision, recorded with one gate condition unmet: there is no outside implementer yet. Until one commits, every release stays a draft (see GOVERNANCE.md).
**Reason:** Each harness and tool reports outcomes and evidence in its own words, and the standards beneath a factory stop short of authority, outcome, and evidence meanings. So each factory defines them itself, and one factory's records mean nothing certain to another.

## Gate 0, condition by condition

| Condition | Status | Basis |
|---|---|---|
| 1. A named, real interoperability failure | Met | Section 1 |
| 2. Two implementers, or one plus a live product | **Not met.** No implementation exists yet; the maintainer plans two private ones | Section 2 |
| 3. No existing standard to profile or extend | Met for meaning, not for envelopes. The envelopes exist and OSFP reuses them; their meanings do not | Section 3 |

## 1. The failure today

Each item below is a place where two parts of a factory, or a factory and its reader, can disagree about what a record means. The sources are public. The maintainer's private systems hit failures of the same shapes, and those details stay private.

- **A restriction that was only an instruction.** A harness may be unable to enforce a disabled tool. UHP handles this honestly: the server must either enforce the restriction or convey it as a standing instruction, and must not overstate enforcement ([UHP 2026-10-19, harnesses §4.3](https://github.com/HarnessRouter/harnessrouter/blob/8a898e95f5c1/protocol/versions/2026-10-19/harnesses.md#43-disabled-tools)). Nothing carries "enforced" or "instruction" into the factory's own records, so a reviewer later cannot tell which one applied.
- **An unknown result read as a failure.** After a timeout, a client "does not know if it can safely retry the request" ([Idempotency-Key draft](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)). For agent tasks, "a retry that runs the work twice is worse than a slow answer" ([UHP 2026-10-19, tasks §6](https://github.com/HarnessRouter/harnessrouter/blob/8a898e95f5c1/protocol/versions/2026-10-19/tasks.md#6-idempotency)). No standard says that a factory which cannot establish what an attempt did must record that, and must not start another attempt on its own.
- **A green check that saw nothing.** pytest exits 5 when "No tests were collected" ([pytest](https://docs.pytest.org/en/stable/reference/exit-codes.html)), but exits 0 when every collected test is skipped (observed with pytest 9.0.2). A shell pipeline returns "the exit status of the last command in the pipeline" unless `pipefail` is set ([Bash](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)). A factory that reads only an exit status can report a pass for work that never ran.
- **A check the agent gamed.** Frontier models have raised their scores "by modifying the tests or scoring code, gaining access to an existing implementation or answer that's used to check their work, or exploiting other loopholes in the task environment" ([METR, 2025](https://metr.org/blog/2025-06-05-recent-reward-hacking/)). Evidence that does not record these cannot be trusted.
- **Supervision inside the thing it supervises.** A persistent system "needs an independent Control Loop outside the main system" ([DeepSeek Harness, 2026](https://x.com/DeepSeekHarness/status/2116857257245987236), an English machine translation that describes ideas, not shipped features). A deadline checked inside a loop that has hung never fires.

## 2. Who would implement it

| Party | Class | Named contact, or "none yet" (counts as zero) |
|---|---|---|
| The maintainer's private software factory | Factory, verifier, supervisor | Sunny Patneedi. Planned; not built or tested against OSFP |
| The maintainer's private scheduled-task system | Supervisor | Sunny Patneedi. Planned; not built or tested against OSFP |
| HarnessRouter (UHP maintainers) | Harness adapter | None yet. To be approached through their proposal process |

## 3. What already exists

| Existing standard (version) | What it covers | What it misses | Profile or extend it instead? |
|---|---|---|---|
| UHP (2026-10-19) | Running harnesses: sessions, tasks, streaming, files, environments, cancellation | Authority above the harness. Its main implementation leaves "auth, data, permissions, and workflow" to the host product ([HarnessRouter](https://harnessrouter.ai/docs/host-app-vs-runtime-agent)) | Profile it (`OSFP.PF.1`) |
| A2A (1.0) | Task messages and states between agents | A factory's grant, unknown-state handling, evidence | Profile it (`OSFP.PF.2`, `OSFP.PF.5`, `OSFP.PF.6`) |
| MCP (2026-07-28) and its Tasks extension | Tool calls; long-running tool tasks | Factory-level authority and outcomes | Profile it (`OSFP.PF.3`) |
| in-toto Attestation (Statement v1) | A signed statement about a subject, with any predicate | A predicate for verification results | Extend it with a predicate (`OSFP.EV.1`) |
| SLSA provenance (1.0) | How an artifact was built | Whether it passed its checks | Distinct; reference it |
| CloudEvents (1.0.2) | An event envelope | The meaning of progress events | Use it as the envelope (`OSFP.PR.6`) |
| OpenTelemetry GenAI conventions (Development status) | Spans and attributes for model and agent calls | Authority, outcome, and evidence meaning | Complement it (`OSFP.PF.4`) |
| OAuth 2.0 Rich Authorization Requests (RFC 9396) | Structured authorization details | Enforcement labels, disclosures, time limits; and it rejects unknown fields | Related; a grant is its own record (section 7) |

## 4. First use

The maintainer's own factory and scheduled-task system, both private, are the planned first implementations. They will not count as independent.

## 5. Why a standard, not a schema

The meaning has to hold across organizations: a harness vendor reports an outcome, a factory acts on it, a reviewer trusts the evidence. One team's schema cannot make a harness vendor say "unknown" instead of "done". A profile that harness and factory makers can both cite can.
