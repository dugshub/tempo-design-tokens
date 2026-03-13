# Operation: Stack Sync

Handle post-merge cleanup — detect merged PRs, retarget next PR, rebase remaining branches, and clean up.

## When to Use

After one or more PRs in a stack are merged on GitHub (typically squash-merged into main/trunk).

## Algorithm

### 1. Load context

```bash
CURRENT_BRANCH=$(git branch --show-current)
REPO_NAME=$(basename "$(git rev-parse --show-toplevel)")
STACK_FILE="$HOME/.claude/stacks/${REPO_NAME}.json"
```

Read `$STACK_FILE`, find active stack. If not on a stack branch, list stacks and ask which to sync.

### 2. Fetch latest from remote

```bash
git fetch origin
```

### 3. Detect merged branches

For each branch in the stack that has a PR number:

```bash
gh pr view <PR> --json state --jq '.state'
```

Collect branches where state is `MERGED`.

If no branches are merged: "No merged PRs found in stack '<name>'. Nothing to sync."

### 4. Process merged branches (bottom to top)

Merged branches must be processed from the bottom of the stack upward. For each merged branch:

**a. Identify the next unmerged branch:**
Find the first branch after the merged one that is NOT merged. This is the branch that needs retargeting.

**b. Retarget the next PR:**
The next PR was targeting the merged branch. Now it should target trunk:
```bash
gh pr edit <next-PR> --base <trunk>
```

**c. Track the old tip:**
The merged branch's old tip is needed for `--onto`:
```bash
OLD_TIP=$(read from JSON: merged branch's tip)
```

**d. Remove merged branch from stack JSON:**
Remove the branch entry from the `branches` array.

**e. Delete local merged branch (safe):**
```bash
git branch -d <merged-branch> 2>/dev/null || true
```
The `-d` (not `-D`) ensures we only delete if fully merged.

### 5. Rebase remaining branches onto trunk

After removing all merged branches, the remaining stack's bottom branch needs to be rebased onto the updated trunk:

```bash
git fetch origin <trunk>
git rebase --onto origin/<trunk> <old-tip-of-last-merged-branch> <first-remaining-branch>
```

Then cascade rebase through the rest of the remaining branches (same algorithm as `restack.md` step 6):

For each remaining branch from index 1 onward:
```bash
git rebase --onto <previous-branch> <old-tip-of-previous> <current-branch>
```

Handle worktrees the same way as restack — check `git worktree list` and cd into worktree directories as needed.

### 6. Update all PR comments

After retargeting and rebasing, update stack comments on all remaining PRs using the comment template.

### 7. Save JSON and report

Update all remaining branch tips. Set `updated` timestamp.

If stack is empty (all PRs merged): remove the stack entry entirely.

Report:
```
Synced stack '<name>':

  Merged (removed):
    ✓ doug/frozen-column/1-sticky-header  #101  (squash-merged to main)

  Remaining:
    1. doug/frozen-column/2-scroll-shadow  #102  (retargeted to main, rebased)
    2. doug/frozen-column/3-resize-handle  #103  (rebased)

  Stack comments updated on 2 PRs.
```

Or if all merged:
```
Stack '<name>' fully merged! All 3 PRs landed in main.
Removed stack '<name>' from tracking.
```

## Edge Cases

- **Multiple PRs merged at once**: Process bottom-to-top. Each merged branch removal shifts indices. The first unmerged branch's base becomes trunk.
- **Non-contiguous merges**: If PR 1 and PR 3 merged but PR 2 didn't — this is unusual. Warn the user and retarget PR 2 to trunk, rebase it onto trunk.
- **Squash merge**: The old commits are gone from main's history. That's why we use stored `tip` values for `--onto` — they reference the pre-merge branch state.
- **Rebase conflicts during sync**: Same handling as restack — stop, report, save state, let user resolve and `--continue`.
- **Detached HEAD**: If user is on a detached HEAD after sync, check them out to the first remaining branch.
