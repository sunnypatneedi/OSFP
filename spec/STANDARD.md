# Open Software Factory Profile (OSFP)

**Version:** 0.1.0-draft.1
**Date:** 2026-11-11
**Status:** Draft for review. Not adopted. No outside review yet.
**Editor:** Sunny Patneedi

## 1. Purpose

A software factory turns a request into a verified change. It decides what a task may touch, hands the work to a harness, checks the result, and shows it to a person. The standards a factory builds on define how to run a harness, call a tool, and sign a statement. None of them defines what a factory's own records mean. So each factory defines that itself, and a reader cannot tell what another factory's records claim.

OSFP gives those records one meaning. It profiles standards that already exist, and it adds four records that none of them define:

- a **task grant**, which states the authority a task runs under;
- an **outcome**, which states what happened to an attempt, including when nobody knows;
- **verification evidence**, which states what was checked and whether it passed;
- **progress** events, which show that work is moving and what happens when it stops.

## 2. Scope

OSFP covers:

- the authority a task runs under, and how that authority is checked and revoked;
- the states of an attempt, including the unknown state and the three parts of a stop;
- the evidence that a change passed its checks, and what may not count as evidence;
- the time limits on an attempt, the supervisor that enforces them, and scheduled tasks that did not run;
- how these records travel on the standards in section 14.

## 3. Out of scope

Each topic below belongs to another standard. OSFP refers to it and does not redefine it.

- Running a harness (sessions, tasks, streaming, files, environments): defer to UHP, or to the harness's own interface.
- Calling tools: defer to MCP.
- Packaging skills and plugins: defer to Agent Skills and Agent Plugins.
- Repository instructions for agents: defer to AGENTS.md.
- Messages between agents: defer to A2A.
- Traces, metrics, and logs: defer to OpenTelemetry.
- Build provenance: defer to SLSA.
- Issuing and validating tokens: defer to OAuth 2.0.
- Choosing a model or a harness for a task: a product decision, not part of this profile.

OSFP is not a harness, a runtime, a product, or a certification. It does not say how to build a factory. It says what a factory's records mean.

## 4. Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in BCP 14 [RFC2119] [RFC8174] when, and only when, they appear in all capitals, as shown here.

Each rule has an ID of the form `OSFP.<area>.<n>`. The areas are GE (general), AU (task grant), OU (outcome), EV (verification evidence), PR (progress), and PF (rules for the standards OSFP profiles). IDs are permanent. The file `standard.json` holds every rule with the same ID and the same words, and names the classes of product each rule applies to (section 12).

OSFP records are JSON objects. Field names in this document are written in `code`. The field tables are informative in this draft; the rules are normative. Section 16 defines each term, and this document uses each term in one sense only.

## 5. The factory model

This section is informative.

A **request** arrives. The **factory** turns it into a **task** with a fixed scope, and records a **task grant** that a person approved. It dispatches an **attempt** of the task to a **harness**, and records each change in the attempt's state as an **outcome**. A **verifier** runs **checks** on the result and records **verification evidence**. A person reviews the evidence and records a **verdict**. Throughout, a **supervisor** enforces the attempt's time limits, and **progress** events show whether work is moving.

A **schedule** is a standing request. Each time it fires, it creates a **scheduled task**. A scheduled task runs like any other task, under a grant derived from a **standing grant** that a person approved for the schedule.

| Layer | What answers it | Standard |
|---|---|---|
| Which task is authorized, and what happened to it | The factory | OSFP |
| Which harness runs the attempt, and how | The harness interface | UHP, or the harness's own interface |
| Which tools the harness may call | The tool protocol | MCP |
| Which model answers a request inside the harness | The harness or a model router | None; a product decision |

These layers do not grant each other's authority. A harness cannot widen a grant. A tool listing grants nothing. A model's text is not evidence.

## 6. General rules

An OSFP record never changes after it is written. When something changes, the producer writes a new record with a new `id`, so any reader can replay what happened.

- `OSFP.GE.1` — Every OSFP record MUST carry `osfpVersion`, `recordType`, and an `id` that is never reused.
- `OSFP.GE.2` — Every timestamp in an OSFP record MUST be a UTC date-time in RFC 3339 format.
- `OSFP.GE.3` — A consumer MUST ignore fields it does not recognize, and MUST reject a record whose `osfpVersion` it does not support.
- `OSFP.GE.4` — A consumer MUST NOT treat a status or state value it does not recognize as success.
- `OSFP.GE.5` — A producer MUST NOT change an OSFP record after writing it; a change of state is a new record with a new `id`.
- `OSFP.GE.6` — A consumer MUST reject a record that reuses a known `id` with different content.

## 7. Task grant

A task grant states the authority one task runs under. A request says what someone wants. Only a grant says what may be touched.

| Field | Meaning |
|---|---|
| `id`, `osfpVersion`, `recordType` | `recordType` is `task-grant` |
| `taskId` | The task this grant covers. A standing grant has `scheduleId` instead |
| `scheduleId` | Standing grants only: the schedule whose tasks this grant covers |
| `generation` | 1 for the first grant of a task. Each later grant for the same task has the next number |
| `requestRef` | A reference to the request. It carries no authority |
| `resources` | Each resource the task may read or change: `uri`, and `access`, which is `read` or `write` |
| `operations` | The operations the task may perform, from the table below |
| `disclosures` | Each item the factory may send to the harness: `source`, `revision`, and `destination` |
| `tools` | Each MCP tool the factory provides: `server` and `name` |
| `restrictions` | Each restriction on the harness: `target` (what is restricted, such as `network` or a tool's name), `rule` (what the restriction does, such as `deny-all` or `disabled`), and `enforcement`, which is `enforced` or `instruction` |
| `limits` | `startAckSeconds` and `totalSeconds` for each attempt (section 10) |
| `approvedBy`, `approvedAt` | The person who approved this grant, or the standing grant it derives from, and when |
| `derivedFrom` | The `id` of the standing grant this grant derives from, if any |
| `expiresAt` | When the grant ends |

| Operation | Permits |
|---|---|
| `start` | Dispatching attempts of the task to a harness |
| `publish` | A side effect visible outside the factory on a resource listed with `write` access, such as pushing to a shared branch, opening a pull request, or posting a message |
| `merge` | Integrating a change into a protected branch or a release |

A grant is never edited. To narrow, widen, or revoke a task's authority, the factory records a new grant for the same task with the next `generation`. The task's latest grant is the one with the highest `generation`. A grant that lists no resources, no operations, and no disclosures permits nothing, so recording one revokes the task's authority.

A harness can make side effects of its own, without passing through the factory. The check before each side effect (`OSFP.AU.4`) does not reach those. A factory that cannot stop such a side effect records the restriction against it as `instruction`, never as `enforced` (`OSFP.AU.5`).

A task grant is its own record, not an OAuth 2.0 `authorization_details` object [RFC9396]. That RFC requires a `type` field, and requires an authorization server to refuse an object of known type that contains unknown fields. OSFP consumers ignore unknown fields instead. A factory may translate a grant into an `authorization_details` object for an OAuth server. That translation is outside this profile.

- `OSFP.AU.1` — A factory MUST record a task grant before it dispatches any attempt of that task.
- `OSFP.AU.2` — A factory MUST NOT treat a request, an instruction, a skill, or a tool listing as a grant of authority.
- `OSFP.AU.3` — A grant MUST list every resource, operation, and disclosure it permits, and a factory MUST deny any that the grant does not list.
- `OSFP.AU.4` — Before each side effect it performs or relays, a factory MUST confirm that the task's latest grant is unexpired and permits that side effect, and MUST NOT perform it otherwise.
- `OSFP.AU.5` — For each restriction in a grant, a factory MUST record whether it is enforced or only conveyed to the harness as an instruction, and MUST NOT record an instruction as enforced.
- `OSFP.AU.6` — Each disclosure in a grant MUST name its source, its revision, and its destination.
- `OSFP.AU.7` — A factory MUST NOT place a credential in a model's input.
- `OSFP.AU.8` — A factory SHOULD keep credentials out of reach of code that a model writes, for example behind a proxy outside the harness's sandbox, or as short-lived tokens limited to the grant.
- `OSFP.AU.9` — A grant's `approvedBy` MUST name the person who approved it, or the person who approved the standing grant it derives from.
- `OSFP.AU.10` — A grant derived from a standing grant MUST NOT permit anything the standing grant does not permit, and MUST NOT expire later than it.

## 8. Outcome

An outcome states what happened to one attempt at one moment. Its most important state is `unknown`: the factory cannot establish whether the attempt ran or what it changed.

| Field | Meaning |
|---|---|
| `id`, `osfpVersion`, `recordType` | `recordType` is `outcome` |
| `taskId`, `attemptId` | The task, and the attempt this record describes |
| `sequence` | 1 for the first outcome of an attempt. Each later outcome for the same attempt has the next number |
| `harness` | The harness's `name` and `version` |
| `state`, `stateAt` | One state from the table below, and when it began |
| `stopRequestedAt`, `stopConfirmedAt`, `cleanupConfirmedAt` | The three parts of a stop. Each is absent until it happens |
| `note` | Optional plain-language detail, for example why the state is `unknown` |

| State | Meaning |
|---|---|
| `admitted` | The factory accepted the attempt under a grant. The harness has not acknowledged it |
| `started` | The harness acknowledged the attempt |
| `waiting` | The attempt needs input or authorization from a person |
| `completed` | The harness finished. This says nothing about whether the result passed its checks |
| `failed` | The harness reported failure |
| `canceled` | The attempt stopped because someone asked it to |
| `rejected` | The factory or the harness refused the attempt |
| `unknown` | The factory cannot establish whether the attempt ran or what it changed |

When an attempt's state changes, or a stop moves forward, the factory writes a new outcome for the same `attemptId` with the next `sequence`. The attempt's current state is in its outcome with the highest `sequence`. An attempt stays `unknown` until the factory establishes what it did (`OSFP.OU.4`).

A **retry** is a new attempt of a task. It has a new `attemptId`, so no harness can recognize it as a repeat. A **re-send** is the same command sent again under its original identity, which a harness that removes duplicates can recognize. After a timeout, a re-send is safe where the harness removes duplicates. A retry is not, because the first attempt may still be changing things.

- `OSFP.OU.1` — A factory MUST persist an attempt's identity before it dispatches the attempt to a harness.
- `OSFP.OU.2` — An outcome MUST be in exactly one of these states: `admitted`, `started`, `waiting`, `completed`, `failed`, `canceled`, `rejected`, or `unknown`.
- `OSFP.OU.3` — A factory MUST NOT record `started` until the harness acknowledges the attempt; admitting an attempt is not starting it.
- `OSFP.OU.4` — When a factory cannot establish whether an attempt ran or what it changed, it MUST record the state `unknown`.
- `OSFP.OU.5` — While an attempt is `unknown`, a factory MUST NOT start another attempt for the same request without a person's decision.
- `OSFP.OU.6` — A factory MUST record a stop as three separate facts, each with its own time: stop requested, stop confirmed, and cleanup confirmed.
- `OSFP.OU.7` — A factory MUST NOT record cleanup as confirmed until every process, container, and volume the attempt created is gone; the exit of a lead process does not confirm cleanup.
- `OSFP.OU.8` — When a factory sends a command to a harness again, it MUST reuse the command's original identity, and MUST NOT reuse that identity for a different command.

## 9. Verification evidence

Verification evidence states what a verifier checked, on exactly which tree, and what happened. It is an in-toto Statement [in-toto-statement] with this predicate type:

`https://github.com/sunnypatneedi/OSFP/blob/main/predicates/verification-evidence/v0.1.md`

| Predicate field | Meaning |
|---|---|
| `id`, `osfpVersion`, `recordType` | `recordType` is `verification-evidence` |
| `taskId`, `attemptId` | The attempt whose result was checked |
| `checks` | One entry per check, with the fields in the next table |
| `findings` | Each SARIF file's digest, as an in-toto digest set, if any |
| `verifier`, `checkedAt` | Who ran the checks, and when |

| Check field | Meaning |
|---|---|
| `name`, `command` | The check's name, and the command that ran it |
| `status` | `passed`, `failed`, `not-run`, or `incomplete` |
| `unitsExamined`, `unitsSkipped` | How many units the check examined, and how many it skipped |
| `exitStatus` | The exit status of the command that ran the check |
| `outputComplete`, `outputDigest` | False if the output was cut off; the full output's digest, as an in-toto digest set |
| `treeAtStart`, `treeAtEnd` | The checked tree's digest, as an in-toto digest set [in-toto-digest-set], at the check's start and at its end |
| `inputsChanged`, `changedInputs` | True if the attempt changed a test, a grader, an assertion, or any code or configuration that decides this check's result; the paths it changed |
| `answersReachable` | True if the attempt could read the expected answers or a reference implementation that this check compares against |

A check examines **units**: tests for a test suite, files for a linter, targets for a build. A skipped unit is not examined. The exit status alone cannot show this: pytest 9.0.2 exits 0 when every test in a suite is skipped.

A check's status is one of four values. `passed`: the check examined at least one unit, and every unit it examined passed. `failed`: at least one examined unit failed. `not-run`: the check did not run, or it examined no units. `incomplete`: the check started, but its result cannot be trusted, for example because its output was cut off or the tree changed underneath it.

- `OSFP.EV.1` — Verification evidence MUST be an in-toto Statement whose subject identifies the checked tree by a `gitTree` or `dirHash` digest.
- `OSFP.EV.2` — Each check in the evidence MUST report exactly one status: `passed`, `failed`, `not-run`, or `incomplete`.
- `OSFP.EV.3` — A check MUST NOT report `passed` unless it examined at least one unit; a skipped unit is not examined.
- `OSFP.EV.4` — A check MUST record the exit status of the command that ran it, not the status of a command that read its output.
- `OSFP.EV.5` — If a check's output was cut off, or the tree's digest changed between the check's start and its end, the check MUST report `incomplete`.
- `OSFP.EV.6` — If an attempt changed a test, a grader, an assertion, or any code or configuration that decides a check's result, the evidence MUST say so for that check.
- `OSFP.EV.7` — A factory MUST NOT accept text written by a model as verification evidence.
- `OSFP.EV.8` — Findings from static analysis SHOULD be recorded in SARIF 2.1.0 and referenced from the evidence by digest.
- `OSFP.EV.9` — A factory MUST record each verdict with a reference to the evidence it reviewed, and MUST NOT change the status of any check because of a verdict.
- `OSFP.EV.10` — Evidence SHOULD be signed in a DSSE envelope.
- `OSFP.EV.11` — A consumer MUST NOT count a check as passed if its evidence says the attempt changed what decides its result or could read its expected answers, unless a person decides it may.
- `OSFP.EV.12` — If an attempt could read the expected answers or a reference implementation that a check compares against, the evidence MUST say so for that check.

A verdict is `accept`, `needs-changes`, or `reject`. It is a person's decision about a change. It is not permission to apply the change, and it cannot turn a failed or not-run check into a passed one.

## 10. Progress

Progress events show that an attempt is moving. A supervisor enforces the time limits in the grant, and reports scheduled tasks that did not run.

Each event type is the prefix `io.github.sunnypatneedi.osfp.` followed by a name below. CloudEvents asks that an event type start with a reverse-DNS name whose domain defines the event's meaning [cloudevents]. The domain `sunnypatneedi.github.io` belongs to the maintainer.

| Event name | Sent by | Sent when |
|---|---|---|
| `progress.started` | Factory or harness adapter | The harness acknowledged an attempt, or an attempt of a scheduled task began |
| `progress.heartbeat` | Factory or harness adapter | Work is still moving |
| `progress.finished` | Factory or harness adapter | An attempt ended |
| `progress.limit-expired` | Supervisor | A start deadline or a total budget expired |
| `progress.overdue` | Supervisor | A scheduled task did not start by its expected time, or started and did not finish within its total budget |

Each event's `data` is an OSFP record with `recordType` `progress`:

| Field | Meaning |
|---|---|
| `id`, `osfpVersion`, `recordType` | `recordType` is `progress` |
| `taskId`, `attemptId` | The attempt the event is about. An `overdue` event for a task that never started has neither |
| `scheduleId` | For a scheduled task: its schedule |
| `limit`, `action` | `limit-expired` only: `startAckSeconds` or `totalSeconds`, and what the supervisor did |
| `state` | `finished` only: the attempt's outcome state when it ended |
| `result` | On `finished`, for an inspection task: `clean`, `findings`, or `aborted`. On `overdue`: `not-run` or `died` |
| `expectedAt` | `overdue` only: when the scheduled task was expected to start |

An **inspection task** is a task whose purpose is to inspect something and report findings, such as a nightly audit. Its result is `clean` only if it inspected something and found nothing.

- `OSFP.PR.1` — A grant MUST state, for each attempt, a deadline for the harness to acknowledge the start and a total time budget.
- `OSFP.PR.2` — A supervisor MUST run the timer that enforces an attempt's limits outside the loop that runs the attempt.
- `OSFP.PR.3` — When a limit expires, a supervisor MUST request a stop of the attempt.
- `OSFP.PR.4` — An attempt of a scheduled task MUST send a `started` event before it does any work.
- `OSFP.PR.5` — An attempt of an inspection task that inspected nothing MUST report the result `aborted`, never `clean`.
- `OSFP.PR.6` — Progress events SHOULD be sent as CloudEvents.
- `OSFP.PR.7` — A supervisor SHOULD alert a person only when a decision or a sign-off is needed.
- `OSFP.PR.8` — A supervisor MUST report a scheduled task that sent no `started` event by its expected start as `not-run`, and one that started but did not finish within its total budget as `died`.

When a limit expires, the factory records the outcome from what it can establish. A stopped attempt may already have changed things, so the outcome is often `unknown` (`OSFP.OU.4`).

## 11. Rules for the standards OSFP profiles

Each rule here applies only when a factory uses the standard it names, or, for the rule on traces, only when it traces attempts. A factory that does neither meets these rules by default.

A2A uses different words for the same states, and which party acknowledges a task depends on which side is the A2A server. The table gives both directions:

| OSFP state | A factory reporting over A2A (the factory is the A2A server) | A factory reading an A2A agent (the agent runs the attempt) |
|---|---|---|
| `admitted` | `TASK_STATE_SUBMITTED` | No equivalent |
| `started` | `TASK_STATE_WORKING` | `TASK_STATE_SUBMITTED` or `TASK_STATE_WORKING` |
| `waiting` | `TASK_STATE_INPUT_REQUIRED` or `TASK_STATE_AUTH_REQUIRED` | Either of those |
| `completed` | `TASK_STATE_COMPLETED` | `TASK_STATE_COMPLETED` |
| `failed` | `TASK_STATE_FAILED` | `TASK_STATE_FAILED` |
| `canceled` | `TASK_STATE_CANCELED` | `TASK_STATE_CANCELED` |
| `rejected` | `TASK_STATE_REJECTED` | `TASK_STATE_REJECTED` |
| `unknown` | `TASK_STATE_UNSPECIFIED` | `TASK_STATE_UNSPECIFIED`, or no state |

A2A defines `TASK_STATE_UNSPECIFIED` as "an unknown or indeterminate state" [a2a-spec]. It is also the enum's zero value, and the A2A schema marks the state field required [a2a-proto]. A protobuf JSON encoder omits a field that holds its default value unless told otherwise [protobuf-json]. So an `unknown` sent without care can arrive with no state at all.

- `OSFP.PF.1` — A factory that runs harnesses through UHP MUST map each UHP task to exactly one OSFP attempt, and MUST keep its own attempt identity after the harness stops retaining the idempotency key.
- `OSFP.PF.2` — When a factory reports an outcome over A2A, it MUST map `unknown` to `TASK_STATE_UNSPECIFIED`, never to a terminal state.
- `OSFP.PF.3` — When a grant provides a tool from an MCP server, the grant MUST identify the tool by the server's name and the tool's name.
- `OSFP.PF.4` — Traces of an attempt SHOULD use OpenTelemetry and SHOULD carry the OSFP task and attempt identifiers as attributes.
- `OSFP.PF.5` — When a factory reads an A2A task, it MUST treat `TASK_STATE_UNSPECIFIED`, or a missing state, as `unknown`.
- `OSFP.PF.6` — A factory that reports `unknown` over A2A in JSON SHOULD emit the `state` field even though it holds the default value.

## 12. Conformance

**Classes of products.** Each class conforms on its own. A product that plays several roles claims each class it plays, and meets the rules of each.

| Class | What it does | Rules it meets |
|---|---|---|
| Factory | Records grants and outcomes, dispatches attempts, accepts evidence, and records verdicts | `OSFP.GE.1` to `OSFP.GE.6`, `OSFP.AU.1` to `OSFP.AU.10`, `OSFP.OU.1` to `OSFP.OU.8`, `OSFP.EV.7`, `OSFP.EV.9`, `OSFP.EV.11`, `OSFP.PR.1`, `OSFP.PR.4` to `OSFP.PR.6`, `OSFP.PF.1` to `OSFP.PF.6` |
| Harness adapter | Reports one harness's lifecycle as outcomes and progress events | `OSFP.GE.1`, `OSFP.GE.2`, `OSFP.GE.5`, `OSFP.OU.2` to `OSFP.OU.4`, `OSFP.OU.6`, `OSFP.OU.7`, `OSFP.PR.4` to `OSFP.PR.6`, `OSFP.PF.4`, `OSFP.PF.5` |
| Verifier | Runs checks and records verification evidence | `OSFP.GE.1`, `OSFP.GE.2`, `OSFP.GE.5`, `OSFP.EV.1` to `OSFP.EV.6`, `OSFP.EV.8`, `OSFP.EV.10`, `OSFP.EV.12` |
| Supervisor | Enforces time limits, and reports scheduled tasks that did not run | `OSFP.GE.1` to `OSFP.GE.6`, `OSFP.PR.2`, `OSFP.PR.3`, `OSFP.PR.6` to `OSFP.PR.8` |
| Consumer | Reads OSFP records | `OSFP.GE.3`, `OSFP.GE.4`, `OSFP.GE.6`, `OSFP.EV.11` |

A harness adapter that records outcomes for a factory meets the outcome rules as if it were that factory.

**SHOULD rules.** A rule written with SHOULD applies like any other rule of its class. A product that does not follow one states which, and why, in its conformance claim.

**Claims.** A product claims conformance by naming the version and each class it claims, for example "OSFP 0.1.0-draft.1, Factory and Supervisor". Conformance is a self-declaration. No body certifies OSFP conformance.

**What the checker covers.** `scripts/check-standard.mjs` checks this document against `standard.json`: rule IDs, the words of each rule at its own definition, citations, sections, and links. It does not test implementations. No conformance test suite for implementations exists in this draft.

## 13. Versioning and stability

OSFP follows Semantic Versioning 2.0.0. A patch changes wording only, and valid records stay valid. A minor adds optional rules or fields. A major renames, removes, or narrows a rule, or adds a required field. Before 1.0, a minor may break; the CHANGELOG calls out every break with a migration note.

Rule IDs are never renamed or reused. To change a rule's meaning, deprecate it (`deprecatedIn`, `replacedBy`) and add a new ID. The predicate type URI and the event types change with every breaking change to their records. Each release is an annotated git tag. A tagged release is never edited; fixes ship in a new version.

## 14. Crosswalks and boundaries

| OSFP record | Profiled standard (version) | Relation |
|---|---|---|
| Task grant | OAuth 2.0 Rich Authorization Requests [RFC9396] | Related, not a carrier. See section 7 |
| Task grant | OAuth 2.0 [rfc6749], section 6 | Partial. A refresh request may not ask for "any scope not originally granted"; in the same way, a derived grant may not exceed its standing grant |
| Task grant | OAuth 2.0 Token Introspection [rfc7662] | Partial. Checking the latest grant before each side effect follows the same pattern as checking that a token is "currently active" at the time of use |
| Task grant | OAuth 2.0 Token Exchange [rfc8693] | Partial. One way to give a harness a short-lived credential |
| Task grant | UHP 2026-10-19, harnesses section 4.3 [uhp-harnesses] | Partial. UHP requires a server to enforce a disabled tool or convey it as an instruction, and not to overstate enforcement. OSFP records which one happened, and applies the same rule to every restriction |
| Task grant | MCP 2026-07-28 [mcp-spec] | Partial. MCP asks a host to obtain "explicit user consent before invoking any tool". A grant records whose consent a task runs under |
| Outcome | A2A [a2a-spec] | Mapped in section 11 |
| Outcome | UHP 2026-10-19, tasks [uhp-tasks] | Partial. One UHP task is one OSFP attempt. A UHP idempotency key is the identity of a re-send |
| Outcome | MCP 2026-07-28, Tasks extension | Partial. An MCP task handle is a harness-side identity; the OSFP attempt identity is the factory's |
| Outcome | Kubernetes Jobs [k8s-job] | Different on purpose. A Job that passes its deadline becomes "Failed with reason: DeadlineExceeded". OSFP records what the factory can establish, often `unknown`, because a stopped attempt may already have changed things |
| Verification evidence | in-toto Statement v1 [in-toto-statement] | Uses it as the envelope. OSFP defines a predicate |
| Verification evidence | SLSA provenance 1.0 | Distinct. Provenance says how an artifact was built; OSFP evidence says what was checked and whether it passed |
| Verification evidence | SARIF 2.1.0 [sarif] | Uses it for static-analysis findings |
| Progress | CloudEvents 1.0.2 [cloudevents] | Uses it as the envelope |
| Progress | Kubernetes CronJob [k8s-cronjob] | Partial. A CronJob skips a Job that misses its starting deadline and counts it as failed. OSFP reports that task as `not-run` |
| Progress | OpenTelemetry GenAI conventions [otel-genai] | Complementary. Those conventions were in Development status on 2026-11-11, so OSFP does not depend on their attribute names |

**Deliberate boundaries.** OSFP does not define how a harness runs (UHP's job), how a tool is called (MCP's), or how agents talk to each other (A2A's).

## 15. Privacy and security considerations

- **Grants reveal intent and reach.** A grant lists resources, disclosures, and their destinations. Store grants where only the factory's operators can read them. Share them across a trust boundary only when the receiver needs them.
- **Untrusted input cannot grant authority.** Events, messages, web pages, issue text, and tool descriptions that reach an attempt may contain instructions. They are requests at most, never grants. A factory that obeys them uses its own authority for someone else's purpose, which is the confused deputy problem [confused-deputy] (`OSFP.AU.2`).
- **Credentials stay outside the model.** A credential in a model's input can leak through normal output. A credential in an environment variable or a workspace file can be read by code the model writes. `OSFP.AU.8` is only a recommendation in this draft, because common harnesses read credentials from environment variables today.
- **Evidence can leak.** Check output may contain secrets or personal data. Record output by digest, and keep the full output where the operator controls it.
- **Model reasoning stays out.** OSFP records never carry a model's reasoning. A model's claim that it succeeded is not evidence (`OSFP.EV.7`).
- **Checks can be gamed.** Models have raised their scores by changing tests or scoring code, by reading the answers a check uses, and by exploiting loopholes in the task environment [metr-reward-hacking]. Evidence records the first two (`OSFP.EV.6`, `OSFP.EV.12`). A loophole that leaves no trace in the change is not covered.
- **Signing.** Unsigned evidence can be forged by anyone who can write to its store. Sign evidence (`OSFP.EV.10`), and verify the signature before trusting it.

## 16. Terminology

- **Factory**: the product that authorizes tasks, dispatches attempts, and records their outcomes.
- **Harness**: the program that runs an attempt, for example a coding agent.
- **Harness adapter**: a product that reports one harness's lifecycle as OSFP outcomes and progress events.
- **Verifier**: a product that runs checks and records verification evidence.
- **Supervisor**: a product that enforces an attempt's time limits and reports scheduled tasks that did not run.
- **Producer**: any product that writes OSFP records.
- **Consumer**: any product that reads OSFP records. A factory that reads evidence is a consumer of it.
- **Request**: what someone asked for. A request carries no authority.
- **Task**: one request with a fixed scope, covered by its grants.
- **Attempt**: one execution of a task by one harness. A task can have several attempts.
- **Retry**: a new attempt of a task, with a new identity.
- **Command**: a message that asks a harness to act, such as starting or stopping an attempt.
- **Re-send**: the same command sent again under its original identity.
- **Task grant**: the record of the authority a task runs under.
- **Standing grant**: a task grant that covers every task a schedule creates.
- **Schedule**: a standing request that creates a task each time it fires.
- **Scheduled task**: a task that a schedule created.
- **Inspection task**: a task whose purpose is to inspect something and report findings.
- **Disclosure**: an item of information the factory sends to a harness, such as a document or an issue.
- **Model input**: everything a model receives in one call, including instructions, messages, files, and tool results.
- **Side effect**: an operation that changes something outside the attempt's own workspace, such as a write to a repository, a message, a publication, or a payment.
- **Outcome**: the record of an attempt's state at one moment.
- **Unknown**: the outcome state that means the factory cannot establish what happened.
- **Check**: one executed verification step, such as a test suite, a build, or a linter.
- **Unit**: one thing a check examines and counts: a test, a file, or a build target.
- **Verdict**: a person's decision about a change: accept, needs changes, or reject.

## 17. Known limitations

- No outside review yet. One adversarial review ran before publication; VERIFICATION.md records it.
- No implementation exists yet. The maintainer plans two private ones, and they will not count as independent.
- No conformance test suite for implementations exists. The checker checks this document only.
- The record field tables are informative in this draft. JSON Schemas for the four records are planned for 0.2.
- Restriction targets and rules are free text, so two factories can describe the same restriction differently.
- The operation vocabulary is small. A deploy or a payment has no operation of its own, so a grant cannot permit one.
- The predicate type and the event types use the maintainer's GitHub namespace. Moving OSFP to another owner changes them.
- The UHP and A2A mappings have not been reviewed by those projects' maintainers.
- Review verdicts are covered by one rule. A full review record, inbound event triggers, skill distribution receipts, routing decision records, and tool definition digests are deferred to the parking lot in appendix A.

## 18. References

**Normative.** A2A [a2a-spec]; CloudEvents 1.0.2 [cloudevents]; in-toto Statement v1 [in-toto-statement] and its digest set [in-toto-digest-set]; RFC 2119 and RFC 8174 (BCP 14); RFC 3339 [rfc3339]; SARIF 2.1.0 [sarif].

**Informative.** Every source a rule cites is listed with its URL in the `bibliography` of `standard.json`. Other sources:

- [RFC2119] Bradner, S., "Key words for use in RFCs to Indicate Requirement Levels", BCP 14, RFC 2119, March 1997. https://www.rfc-editor.org/rfc/rfc2119
- [RFC8174] Leiba, B., "Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words", BCP 14, RFC 8174, May 2017. https://www.rfc-editor.org/rfc/rfc8174
- [RFC9396] Lodderstedt, T., Richer, J., and B. Campbell, "OAuth 2.0 Rich Authorization Requests", RFC 9396, May 2023. https://www.rfc-editor.org/rfc/rfc9396
- MCP 2026-07-28, Tasks extension, and SLSA provenance 1.0, named in section 14 for their boundaries only.
- W3C, "QA Framework: Specification Guidelines", 2005, for classes of products and the conformance section. https://www.w3.org/TR/qaframe-spec/
- WS-I, "Basic Profile Version 1.0", 2004, an earlier profile that made existing standards interoperate instead of adding new ones. https://www.ws-i.org/Profiles/BasicProfile-1.0-2004-04-16.html

## Appendix A. Parking lot

Not commitments. Recorded so they are not argued again from scratch.

- **Inbound event triggers.** Events from chat, code review, CI, and email that start work, with threads and subscriptions. CloudEvents covers the envelope; the meaning of a thread does not exist yet.
- **A full review record.** A verdict with reviewer identity, scope, and the evidence digests reviewed.
- **Skill distribution receipts.** What each harness actually installed from a shared skill source, by digest.
- **Routing decision records.** Why a factory chose a harness or a model for an attempt.
- **Tool definition digests.** MCP defines no digest for a tool. A digest of the tool's definition, taken when a grant is approved, would show when a server changes a tool after approval.
- **A larger operation vocabulary**, for deploys and payments.
- **Record JSON Schemas and a conformance test suite** for implementations.
