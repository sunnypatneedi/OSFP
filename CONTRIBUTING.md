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
node scripts/check-examples.mjs
```

Both must exit 0. Paste their summary lines into the pull request. They name files relative to the repository, never by local path.

## Breaking changes

Copy [the proposal template](proposals/0000-template.md). A breaking change needs a comment window and outside readers. See GOVERNANCE.md.

## Sign-off

<!-- Choose before the first public release: Developer Certificate of Origin 1.1 sign-off (git commit -s), or a contributor license agreement. Do not claim a process you have not adopted. -->
