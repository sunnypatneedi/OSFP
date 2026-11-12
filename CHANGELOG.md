# Changelog

All notable changes to OSFP are recorded here. The format follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html), as section 13 of the standard defines them.

<!--
For every entry:
- Say what changed in plain words, and name each affected ID.
- Call out every break, with who it affects and how to migrate.
- If a comment window closed early, or a review did not happen, say so in those words.
- Keep a "Known limitations" list for each version.
-->

## [Unreleased]

## [0.1.0-draft.1] - 2026-11-12

First public draft. Before publication, two adversarial AI reviews of earlier texts each found 22 problems, and this draft addresses all 44. `reviews/` lists each finding and its fix. No outside reader has reviewed it.

### Added
- 50 rules in six areas: general (GE), task grant (AU), outcome (OU), verification evidence (EV), progress (PR), and rules for the standards OSFP profiles (PF). Every rule cites a primary source, and names the classes of product it applies to.
- Four records: task grant, outcome, verification evidence (an in-toto predicate), and progress (CloudEvents). Records are never changed; a change is a new record.
- A two-way mapping between OSFP outcome states and A2A task states, and crosswalks to OAuth 2.0, UHP, MCP, in-toto, SLSA, SARIF, CloudEvents, Kubernetes, and OpenTelemetry.
- Five conformance classes (factory, harness adapter, verifier, supervisor, consumer), each with its own list of rules.
- Eight informative examples that tell two stories: a task whose first attempt went unknown, and a nightly task that never started.
- A predicate type page under `predicates/`.
- Two zero-dependency checks, a self-test that proves each of their checks can fail, and a CI workflow that runs all three on every pull request and every push to main.
- A need statement, design lessons, a verification record, and the review records.
- The Apache License 2.0, for the whole repository: prose, schemas, examples, and code.

### Known limitations
- No outside review yet.
- No implementation exists yet. The maintainer plans two private ones, and they will not count as independent.
- No conformance test suite for implementations. Record JSON Schemas are planned for 0.2.
