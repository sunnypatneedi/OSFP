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

## [0.1.0-draft.1] - 2026-11-11

First public draft. An adversarial review of an unpublished earlier text found 22 problems, and this draft addresses them before publication. VERIFICATION.md records the review.

### Added
- 50 rules in six areas: general (GE), task grant (AU), outcome (OU), verification evidence (EV), progress (PR), and rules for the standards OSFP profiles (PF). Every rule cites a primary source, and names the classes of product it applies to.
- Four records: task grant, outcome, verification evidence (an in-toto predicate), and progress (CloudEvents). Records are never changed; a change is a new record.
- A two-way mapping between OSFP outcome states and A2A task states, and crosswalks to UHP, MCP, OAuth 2.0, in-toto, SLSA, SARIF, CloudEvents, Kubernetes, and OpenTelemetry.
- Five conformance classes (factory, harness adapter, verifier, supervisor, consumer), each with its own list of rules.
- Informative examples of each record, including a derived grant for a scheduled task and an overdue scheduled task.
- A predicate type page under `predicates/`.
- A zero-dependency checker, and a CI workflow that runs it on every pull request and every push to main.
- A need statement, design lessons, and a verification record.

### Known limitations
- No outside review yet.
- No implementation exists yet. The maintainer plans two private ones, and they will not count as independent.
- No conformance test suite for implementations. Record JSON Schemas are planned for 0.2.
- No license chosen yet.
