# Examples

Informative examples of each OSFP record. They tell two short stories, and refer to each other by fixed IDs. `node scripts/check-osfp.mjs` checks every field and value against its record's tables in the standard, and checks the rules a machine can check, one example at a time and across the set.

## A task whose first attempt went unknown

| File | Record | What it shows |
|---|---|---|
| [task-grant.json](task-grant.json) | Task grant | A person approves task `…a1`: write access to one repository, `start` and `publish`, one disclosure, and one MCP tool. The network is denied, and the denial is enforced. Web search is disabled by instruction only |
| [progress-limit-expired.json](progress-limit-expired.json) | Progress | Attempt `…b1` does not acknowledge its start within 60 seconds. The supervisor reports the expiry and requests a stop |
| [outcome-unknown.json](outcome-unknown.json) | Outcome | A minute later the stop is still unconfirmed. The factory records `unknown`, and does not start another attempt on its own |
| [task-grant-retry.json](task-grant-retry.json) | Task grant | The person approves the task again, as generation 2. Its `unknownAttempts` names `…b1`, so the record shows that the person knew |
| [verification-evidence.json](verification-evidence.json) | Verification evidence | The checks on attempt `…b2`. Unit tests passed: 214 examined, none failed, 3 skipped. Integration tests are `not-run`: all 12 were skipped, and the command still exited 0 |

## A nightly task that never started

| File | Record | What it shows |
|---|---|---|
| [task-grant-standing.json](task-grant-standing.json) | Task grant (standing) | A person approves schedule `…d1` once, for an inspection task: read access to one repository, and `start` only |
| [task-grant-scheduled.json](task-grant-scheduled.json) | Task grant (derived) | The grant for one night's task, `…a2`. It permits nothing the standing grant does not, keeps its restriction, and expires first |
| [progress-overdue.json](progress-overdue.json) | Progress | No `started` event arrives within 120 seconds of the expected start, so the supervisor reports the task as `missed` |
