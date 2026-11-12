# Verification record

One dated entry per release, newest first. Each says what ran, what passed, and what it does not prove.

## 0.1.0-draft.1 — 2026-11-11

- **Ran:** `node scripts/check-standard.mjs` and `node scripts/check-examples.mjs` on Node v25.8.1, macOS.
- **Result:**
  ```
  ok   [version] 0.1.0-draft.1 read from spec/STANDARD.md, spec/standard.json, README.md
  ok   [changelog] looked for [Unreleased] and [0.1.0-draft.1] headings in CHANGELOG.md
  ok   [ids] 50 IDs read from spec/standard.json, 50 unique
  ok   [parity] 50 data IDs and 50 prose IDs compared both ways; unprefixed sweep found 0
  ok   [text] 50 text fields (statement) matched against their ID's own definition; 50 definitions found; 0 restatement(s) with key words
  ok   [pinned] 5 pinned IDs checked
  ok   [citations] 50 items checked for introducedIn; 50 new in 0.1.0; 0 declared gap(s); 31 sources checked for a DOI or URL, presence only
  ok   [keywords] 72 uppercase key words; BCP 14 declaration present
  ok   [sections] 9 required sections looked for among 20 headings
  ok   [links] 19 relative links in 12 Markdown files resolved; 26 external links NOT checked (offline)
  ok   [ci] 1 action references in 1 workflow files checked for SHA pins
  Result: 0 violation(s), 0 warning(s) → exit 0

  6 examples, 120 fields read; 0 problem(s) → exit 0
  ```
- **The checks can fail.** On a copy of this repository, swapping the text of `OSFP.EV.3` and `OSFP.EV.7` and adding a contradictory second `OSFP.EV.3` failed with 4 violations. Five mutations of the examples (an undefined field, an undefined operation, a `sha256` subject digest, a `dev.osfp` event type, and an unknown digest algorithm) each failed `check-examples.mjs`.
- **Sources:** every URL in the bibliography and in the Markdown files was requested on 2026-11-11. Each returned HTTP 200, except two DOIs: doi.org redirected both, and then the publishers' pages refused an automated client (IEEE 202, ACM 403). For those two, the cited passages were read in the public copy at the entry's `url`. The predicate type page resolves only after this draft merges.
- **Passages read and confirmed on 2026-11-11:**
  - `a2a-spec`: the definitions of `TASK_STATE_UNSPECIFIED` and `TASK_STATE_SUBMITTED`; "SHOULD ignore unrecognized fields"; `VersionNotSupportedError`.
  - `a2a-proto`: `TASK_STATE_UNSPECIFIED = 0`, and the state field marked REQUIRED.
  - `anthropic-managed-agents`: "the append-only log of everything that happened"; tokens "never reachable from the sandbox".
  - `bash-pipelines`: the exit status of a pipeline.
  - `cloudevents`: `source` + `id` unique; a re-sent event "MAY have the same `id`"; `type` "SHOULD be prefixed with a reverse-DNS name".
  - `confused-deputy`: "The compiler serves two masters".
  - `deepseek-superagent`: "an independent Control Loop outside the main system"; "notify people only when a decision or sign-off is needed", stated for chat channels; the article's own note that it is a machine translation describing ideas, not features.
  - `idempotency-key`: a timed-out client "does not know if it can safely retry the request"; a key lets the resource "recognize subsequent retries".
  - `in-toto-digest-set`: `gitTree` and `dirHash`. `in-toto-statement`: `predicateType`. The in-toto field types page: a type URI "SHOULD resolve to a human-readable description, but MAY be unresolvable".
  - `k8s-job`: "Failed with reason: DeadlineExceeded". `k8s-cronjob`: `startingDeadlineSeconds`, and missed Jobs counted as failed.
  - `linux-cgroup-v2`: `populated`.
  - `mcp-spec`: tool descriptions "should be considered untrusted"; "explicit user consent before invoking any tool". `mcp-tools`: "Tool name uniqueness is scoped to a single server".
  - `metr-reward-hacking`: the three methods quoted in DESIGN-LESSONS.md.
  - `otel-genai`: "Status: Development".
  - `protobuf-json`: fields with default values "are omitted by default in JSON output".
  - `pytest-exit-codes`: exit code 5, "No tests were collected". `pytest-skipping`: "A skip means that you expect your test to pass only if some conditions are met".
  - `rfc6749`: "any scope not originally granted". `rfc7662`: `active`. RFC 9396 (prose reference only): `type` "is REQUIRED"; an object "of known type but containing unknown fields" is refused.
  - `saltzer-schroeder`: "Fail-safe defaults" and "Complete mediation".
  - `uhp-harnesses`: section 4.3. `uhp-tasks`: section 6, including "Idempotency keys SHOULD be retained for at least 24 hours".
  - `w3c-prov-dm`: "Usage is the beginning of utilizing an entity by an activity".
  - Resolved, passage not re-read on that date: `dsse`, `k8s-pod-lifecycle`, `rfc3339`, `rfc8693`, `sarif`.
- **Observed behavior:** with pytest 9.0.2 on Python 3.14.5, a suite whose two tests are both skipped exits 0 ("2 skipped"), and an empty suite exits 5 ("no tests ran").
- **Fixtures:** the six files in `examples/` parse as JSON and pass `check-examples.mjs`. They are not validated against record schemas, because record schemas do not exist yet.
- **Adversarial review:** one, on 2026-11-11, by a fresh-context AI reviewer, of an unpublished earlier text of this draft. Verdict: block, with 22 findings. This text addresses them before first publication; the pull request that publishes it lists each finding and its fix. The license is still open, because the owner has not chosen one.
- **Outside review:** none yet.
- **Does not prove:** that each source supports its rule as strongly as the rule needs; that the prose is clear, correct, or in scope; that the field tables are complete; that any implementation conforms; that anything deleted from both prose and data was meant to go.
