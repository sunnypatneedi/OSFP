# Governance

## Who decides today

OSFP is in bootstrap stewardship. Sunny Patneedi drafts and maintains it. No steering committee, foundation, or working group exists, and this file claims none. This file adds a body the day that body holds its first decision, not before.

## When a release stops being a draft

Every release is a draft until both of these hold:

- two outside readers have reviewed it on the record;
- at least one outside implementer has committed, in public, to implement it.

This is the only condition. Other files point here.

An **outside reader** is a named person, other than the maintainer, who reviews a change on the record and discloses no interest in it. An AI review helps the editor, but it is not an outside reader.

## Decision classes

| Change | Before merge | Review on the record |
|---|---|---|
| Editorial: changes no rule's meaning; valid records stay valid | Pull request | Maintainer |
| Additive: an optional field, a rule that binds only that field, an example, or a crosswalk | Issue, pull request, and a 14-day comment window | Maintainer and one outside reader |
| Breaking: a rename or a removal; a narrower, looser, or new rule; a new required field | Proposal in `proposals/`, a 30-day comment window, and a migration note | Two outside readers |
| Governance or license | Proposal and a 30-day comment window | Owner, in writing |

A change that could fit two classes takes the stricter one. Moving a rule from MUST to SHOULD, or from SHOULD to MUST, is breaking.

A comment window runs to its stated date. If it closes early, the CHANGELOG says so in those words.

A pull request with a failing check does not merge.

## Bootstrap

The first draft, 0.1.0-draft.1, entered without a comment window, because there was nothing yet to change. Two AI reviews ran before publication instead, and VERIFICATION.md records them.

Until outside readers exist, the maintainer may publish further drafts alone. Each one keeps the window and the proposal its class requires, says in its CHANGELOG entry that no outside reader reviewed it, and stays a draft.

## Conflicts of interest

A contributor discloses any interest in a decision (employer, product, or funding) in the pull request body. A contributor with a direct interest does not approve that change. The one exception is the maintainer during bootstrap, who approves drafts despite the interest disclosed below. That is why no release leaves draft until outside readers review it.

The maintainer's own interests:

- Sunny Patneedi builds a private software factory and a private scheduled-task system, and plans to implement this profile in both. Neither has been built or tested against it yet. A rule that suits them is not evidence that it suits anyone else; outside review exists to catch that.

## Path to 1.0

1.0 requires all of these:

- two independent implementations;
- a published conformance report;
- outside review of every breaking change since 0.1.

## Forks and sunset

A fork uses a different name. If stewardship stops, archive the last release, its fixtures, and this file. Never transfer authority silently.
