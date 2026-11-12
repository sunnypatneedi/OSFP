# Contributing

Read [GOVERNANCE.md](GOVERNANCE.md) and [EDITING.md](EDITING.md) first. They decide what a change needs.

## Start with a failure

Open an issue that names one concrete interoperability failure, the behavior you expect, and a sanitized example. Never include real personal data, credentials, or private paths.

## Label your evidence

Each claim in a change is one of three kinds. Say which.
- **Documented requirement.** Cite it: a DOI or URL to the primary source.
- **Observed behavior.** Name the implementation and its version.
- **Proposal.** Say so.

Do not make unsupported claims about other products, or about who has adopted this standard.

## Change everything together

Update `spec/STANDARD.md`, `spec/standard.json`, any examples, and `CHANGELOG.md` (under Unreleased) in the same commit. Then run:

```
node scripts/check-standard.mjs
node scripts/check-osfp.mjs
node scripts/self-test.mjs
```

All three must exit 0. Paste their summary lines into the pull request. They name files relative to the repository, never by local path. If you change a check, add a self-test case that proves the new check can fail.

## Breaking changes

Copy [the proposal template](proposals/0000-template.md). A breaking change needs a comment window and outside readers. See GOVERNANCE.md.

## License of contributions

OSFP is licensed under the [Apache License 2.0](LICENSE). Under section 5 of that license, a contribution you submit for inclusion is licensed under the same terms, unless you say otherwise. No contributor license agreement or sign-off is required today.
