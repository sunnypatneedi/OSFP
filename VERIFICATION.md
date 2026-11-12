# Verification record

One dated entry per release, newest first. Each says what ran, what passed, and what it does not prove.

## 0.1.0-draft.1 — 2026-11-12

- **Ran:** `node scripts/check-standard.mjs`, `node scripts/check-osfp.mjs`, and `node scripts/self-test.mjs`, on Node v25.8.1 on macOS, on 2026-11-12.
- **Result:**
  ```
  ok   [version] 0.1.0-draft.1 read from spec/STANDARD.md, spec/standard.json, README.md
  ok   [changelog] looked for [Unreleased] and [0.1.0-draft.1] headings in CHANGELOG.md
  ok   [ids] 50 IDs read from spec/standard.json, 50 unique
  ok   [parity] 50 data IDs and 50 prose IDs compared both ways; unprefixed sweep found 0
  ok   [text] 50 text fields (statement) compared for equality with their ID's own definition; 50 definitions found; 0 restatement(s) with key words
  ok   [pinned] 5 pinned IDs checked
  ok   [citations] 50 items checked for introducedIn; 50 new in 0.1.0; 0 declared gap(s); 33 sources checked for a DOI or URL, presence only
  ok   [keywords] 75 uppercase key words; BCP 14 declaration present
  ok   [sections] 9 required sections looked for among 22 headings
  ok   [links] 31 relative links in 15 Markdown files resolved; 33 external links NOT checked (offline)
  ok   [ci] 1 action references in 1 workflow files checked for SHA pins
  Result: 0 violation(s), 0 warning(s) → exit 0

  ok   [schema] 50 rules and 33 sources in spec/standard.json validated against schema/standard.schema.json
  ok   [examples] 8 examples, 176 fields read, each against its own record's tables and its own values
  ok   [rules] 79 rule checks on 8 examples, one by one and as a set
  ok   [classes] 5 rows of the conformance table compared both ways with the classes of 50 rules
  ok   [references] 35 keys cited in the prose, 47 entries in section 18, 33 bibliography URLs compared
  Result: 0 violation(s) → exit 0

  60 cases, 60 behaved → exit 0
  ```
- **The checks can fail.** The self-test makes one change to a copy of the repository per case and expects the named failure. Its 58 cases cover each of the 16 named checks, and every wrong copy that the second review built and an earlier version of the checks passed. The four ways the second review defeated the text check are also cases in the checker's own self-test, in the create-standards skill: against the checker version the review defeated, all four exit 0, and against this one, all four fail.
- **Sources:** every external URL in the repository (57) was requested on 2026-11-12, and each returned HTTP 200. github.com answers 200 even for a file that does not exist, so each GitHub file link was also fetched from raw.githubusercontent.com at its pinned commit or tag. Each exists, except the predicate type page, which this draft adds. Line anchors were checked against file lengths. The two DOIs resolved on 2026-11-11, but their publishers refuse automated clients, so their passages were read in the public copies at each entry's URL.
- **Passages read and confirmed** at the version each reference names, on 2026-11-11 or 2026-11-12:
  - `a2a-spec` 1.0.1: the definitions of `TASK_STATE_UNSPECIFIED`, `TASK_STATE_SUBMITTED`, `TASK_STATE_INPUT_REQUIRED`, `TASK_STATE_AUTH_REQUIRED`, and `TASK_STATE_COMPLETED`; required fields "MUST be present and set in valid messages"; a blocking send waits for "a terminal state" or "an interrupted state"; "SHOULD ignore unrecognized fields"; `VersionNotSupportedError`; metadata as "a flexible key-value map".
  - `a2a-proto` at the 1.0.1 tag: `TASK_STATE_UNSPECIFIED = 0`, the state field marked REQUIRED, and `Task.metadata`.
  - `anthropic-managed-agents`: "the append-only log of everything that happened"; "Narrow scoping is an obvious mitigation, but"; tokens "never reachable from the sandbox".
  - `bash-pipelines`: the exit status of a pipeline.
  - `cloudevents`: `source` + `id` unique; a re-sent event "MAY have the same `id`"; `type` "SHOULD be prefixed with a reverse-DNS name"; `time` OPTIONAL.
  - `confused-deputy`: "The compiler serves two masters".
  - `idempotency-key`, draft 08: a timed-out client "does not know if it can safely retry the request"; a key lets the resource "recognize subsequent retries".
  - `in-toto-statement` and `in-toto-digest-set`, 1.2.0: `predicateType`; `gitTree` and `dirHash`; non-predefined algorithm names are allowed; `dirHash` hashes the output of `find . -type f`. The field types page: a type URI "SHOULD resolve to a human-readable description, but MAY be unresolvable".
  - `k8s-job`: `activeDeadlineSeconds`, and "Failed with reason: DeadlineExceeded". `k8s-cronjob`: `startingDeadlineSeconds`, and missed Jobs counted as failed.
  - `linux-cgroup-v2`: `populated`. `linux-watchdog`: "a hardware circuit that can reset the computer system in case of a software fault".
  - `mcp-spec`: tool descriptions "should be considered untrusted"; "explicit user consent before invoking any tool". `mcp-tools`: "Tool name uniqueness is scoped to a single server"; the server name "SHOULD NOT be relied upon for disambiguation".
  - `metr-reward-hacking`: the three methods quoted in DESIGN-LESSONS.md.
  - `otel-genai` at the cited commit: "Status: Development".
  - `protobuf-json`: fields at their default value are "omitted by default in JSON output". `protobuf-presence`: fields with implicit presence "are not serialized if they contain their default value".
  - `pytest-exit-codes` and `pytest-skipping`, 9.0: exit code 5, "No tests were collected"; "A skip means that you expect your test to pass only if some conditions are met".
  - `RFC6749`: "any scope not originally granted". `RFC7662`: `active`. `RFC9396`: `type` "is REQUIRED"; an object "of known type but containing unknown fields" is refused.
  - `saltzer-schroeder`: "Fail-safe defaults" and "Complete mediation".
  - `slsa-build` 1.2: signing material "MUST NOT be accessible to the environment running the user-defined build steps". `slsa-provenance` 1.2: "Describe how an artifact or set of artifacts was produced". `slsa-vsa` 1.2: `inputAttestations` and `verificationResult`.
  - `uhp-harnesses`, section 4.3: "MUST enforce it as a hard block"; "as a standing instruction"; "MUST NOT overstate". `uhp-tasks`, sections 3.2 and 6: "the task ends on the question"; "a normal continuation"; keys "SHOULD be retained for at least 24 hours".
  - `w3c-prov-dm`: "Usage is the beginning of utilizing an entity by an activity".
  - `agent-plugins`: a 1.0.0 format for Agent Skills and MCP servers. `mcp-tasks`: `io.modelcontextprotocol/tasks`.
  - Resolved, passage not re-read: `agent-skills`, `agents-md`, `dsse`, `k8s-pod-lifecycle`, `otel`, `RFC2119`, `RFC3339`, `RFC8174`, `RFC8693`, `sarif`, `semver`, `w3c-qa`, `ws-i-bp`.
- **Observed behavior:** with pytest 9.0.2 on Python 3.14.5, on 2026-11-12: a suite whose two tests are both skipped exits 0 ("2 skipped"); an empty suite exits 5 ("no tests ran"); "1 passed, 1 xfailed, 1 error" exits 1; and `-k` that deselects all tests but one passing test exits 0 ("1 passed, 2 deselected").
- **Schema:** `check-osfp.mjs` validates `spec/standard.json` against `schema/standard.schema.json` on every run. It implements only the keywords that schema uses, and stops with exit 2 if the schema uses another.
- **Fixtures:** the eight files in `examples/` pass `check-osfp.mjs`. No record schemas exist yet, so nothing validates them against one.
- **Adversarial reviews:** two, by fresh-context AI reviewers, of unpublished earlier texts. On 2026-11-11: block, with 22 findings ([reviews/2026-11-11.md](reviews/2026-11-11.md)). On 2026-11-12: block, with 4 blocking findings among 22 ([reviews/2026-11-12.md](reviews/2026-11-12.md)). The editor re-read the cited source for each finding before fixing it, and the self-test re-checks each blocking finding that a machine can check. No third review has read the result.
- **Outside review:** none yet.
- **Does not prove:** that each source supports its rule as strongly as the rule needs; that the prose is clear, correct, or in scope; that the field tables are complete; that any implementation conforms; that anything deleted from both prose and data was meant to go; or that a sentence which contradicts a rule without a key word would be caught.
