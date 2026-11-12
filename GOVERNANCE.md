# Governance

## Who decides today

OSFP is in bootstrap stewardship. Sunny Patneedi drafts and maintains it. No steering committee, foundation, or working group exists, and this file claims none. Until outside reviewers exist, every release is a draft.

<!-- Name only bodies and people that exist today. Add a body here the day it holds its first decision, not before. -->

## Decision classes

| Change | Before merge | Review on the record |
|---|---|---|
| Editorial: wording only; valid data stays valid | Pull request | Maintainer |
| Additive: new optional item, example, or crosswalk | Issue, pull request, and a 14-day comment window | Maintainer and one outside reader |
| Breaking: rename, removal, narrowed meaning, or a new required field | Proposal in `proposals/`, a 30-day comment window, and a migration note | Two outside readers |
| Governance or license | Proposal and a 30-day comment window | Owner, in writing |

<!-- Pick window lengths once and keep them. The numbers above are defaults, not facts about any other standard. -->

A comment window runs to its stated date. If it closes early, the CHANGELOG says so in those words.

A pull request with a failing check does not merge.

## Conflicts of interest

A contributor discloses any interest in a decision (employer, product, or funding) in the pull request body. A contributor with a direct interest does not approve that change. The one exception is the maintainer during bootstrap stewardship: the maintainer approves editorial changes despite the interest disclosed below. Additive and breaking changes also need outside readers, so no change to what the standard requires rests on the maintainer's approval alone.

The maintainer's own interests:

- Sunny Patneedi builds a private software factory and a private scheduled-task system, and plans to implement this profile in both. Neither has been built or tested against it yet. A rule that suits them is not evidence that it suits anyone else; outside review exists to catch that.

## Path to 1.0

1.0 requires all of these:
- two independent implementations;
- a published conformance report;
- outside review of every breaking change since 0.1.

## Forks and sunset

A fork uses a different name. If stewardship stops, archive the last release, its fixtures, and this file. Never transfer authority silently.
