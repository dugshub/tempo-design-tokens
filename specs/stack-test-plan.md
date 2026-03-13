# Stack Tool Test Plan

Step-by-step guide to exercise all `/stack` operations against this repo (`dugshub/tempo-design-tokens`).

## Prerequisites

- You're in `/Users/dug/Projects/sandbox/stack-test`
- On `main` branch, clean working tree
- `gh auth status` shows logged in as `dugshub`
- `~/.claude/stacks/` directory exists (created by dealbrain setup)

---

## Test 1: Create a Stack (Explicit Mode)

**Goal:** `/stack create` initializes a new stack and creates the first branch.

```
/stack create add-themes
```

**Expected:**
- Stack JSON created at `~/.claude/stacks/stack-test.json`
- New branch: `doug/add-themes/1-<description>` (Claude will ask for a description)
- JSON contains one stack entry with one branch, null PR, recorded tip

**Verify:**
```bash
cat ~/.claude/stacks/stack-test.json
git branch --show-current
```

---

## Test 2: Make Changes and Commit on Branch 1

**Goal:** Add real code so the branch has substance for a PR.

Add a dark theme to the tokens:

```typescript
// src/tokens/themes.ts
import { colors } from './colors';

export const themes = {
  light: {
    background: colors.neutral[50],
    foreground: colors.neutral[900],
    primary: colors.primary[600],
    border: colors.neutral[200],
  },
  dark: {
    background: colors.neutral[900],
    foreground: colors.neutral[50],
    primary: colors.primary[200],
    border: colors.neutral[700],
  },
} as const;
```

Update `src/index.ts` to export themes. Commit.

---

## Test 3: Create Branch 2 and Push to Stack

**Goal:** `/stack push` adds a new branch to the top of the stack.

1. Create branch 2 manually: `git checkout -b doug/add-themes/2-theme-transformer`
2. Run `/stack push` to register it in the stack
3. Add a theme-to-CSS transformer:

```typescript
// src/transforms/theme-css.ts
type ThemeTokens = Record<string, string>;

export function toThemeCss(name: string, tokens: ThemeTokens): string {
  const lines = [`[data-theme="${name}"] {`];
  for (const [key, value] of Object.entries(tokens)) {
    lines.push(`  --tempo-${key}: ${value};`);
  }
  lines.push('}');
  return lines.join('\n');
}
```

Update `src/index.ts` to export. Commit.

**Verify:**
```bash
cat ~/.claude/stacks/stack-test.json  # should show 2 branches
```

---

## Test 4: Create Branch 3 and Push

**Goal:** Grow the stack to 3 branches.

1. `git checkout -b doug/add-themes/3-theme-tests`
2. `/stack push`
3. Add a test file:

```typescript
// src/transforms/theme-css.test.ts
import { describe, it, expect } from 'bun:test';
import { toThemeCss } from './theme-css';

describe('toThemeCss', () => {
  it('generates CSS custom properties for a theme', () => {
    const result = toThemeCss('dark', { background: '#111827', foreground: '#f9fafb' });
    expect(result).toContain('[data-theme="dark"]');
    expect(result).toContain('--tempo-background: #111827');
    expect(result).toContain('--tempo-foreground: #f9fafb');
  });
});
```

Commit.

---

## Test 5: Check Stack Status

**Goal:** `/stack` shows the full ASCII tree.

```
/stack
```

**Expected output (approximately):**
```
Stack: add-themes (on branch 3 of 3)

main
 └─ 1. doug/add-themes/1-dark-theme  (no PR)
     └─ 2. doug/add-themes/2-theme-transformer  (no PR)
         └─ 3. doug/add-themes/3-theme-tests  (no PR)    ← you are here
```

---

## Test 6: Submit the Stack

**Goal:** `/stack submit` pushes all branches and creates PRs with stack comments.

```
/stack submit
```

**Expected:**
- All 3 branches pushed to origin
- PR #1 created: `doug/add-themes/1-*` → `main` (NOT draft)
- PR #2 created: `doug/add-themes/2-*` → `doug/add-themes/1-*` (draft)
- PR #3 created: `doug/add-themes/3-*` → `doug/add-themes/2-*` (draft)
- Stack comment posted on all 3 PRs with the table format
- JSON updated with PR numbers and tips

**Verify:**
- `gh pr list` shows 3 PRs
- `gh pr view 1 --json baseRefName` → `main`
- `gh pr view 2 --json baseRefName` → `doug/add-themes/1-*`
- Check PR comments on GitHub for the stack table

---

## Test 7: Navigate the Stack

**Goal:** `/stack nav` moves between branches.

```
/stack nav up       # should go to branch 2
/stack nav up       # should go to branch 1
/stack nav bottom   # should stay on branch 1 (already at bottom)
/stack nav top      # should go to branch 3
```

**Verify:** `git branch --show-current` after each nav.

---

## Test 8: Mid-Stack Edit + Restack

**Goal:** Edit branch 1, then `/stack restack` cascades to branches 2 and 3.

1. Navigate to branch 1: `/stack nav bottom`
2. Add a new color to the theme:
   ```typescript
   // In src/tokens/themes.ts, add to both light and dark:
   accent: colors.primary[500],
   ```
3. Commit the change
4. Run `/stack restack`

**Expected:**
- Restack detects branch 1 was modified
- Rebases branch 2 onto updated branch 1
- Rebases branch 3 onto updated branch 2
- All tips updated in JSON
- Report shows successful restack of 2 branches

**Verify:**
```bash
# Branch 2 should have the accent color in themes.ts
git log --oneline doug/add-themes/2-theme-transformer
git show doug/add-themes/2-theme-transformer:src/tokens/themes.ts
```

---

## Test 9: Submit After Restack

**Goal:** `/stack submit` force-pushes rebased branches and updates PR comments.

```
/stack submit
```

**Expected:**
- All 3 branches force-pushed (`--force-with-lease`)
- Existing PRs updated (no new PRs created)
- Stack comments updated on all 3 PRs
- JSON tips updated

---

## Test 10: Merge PR 1 + Sync

**Goal:** Squash-merge PR 1 on GitHub, then `/stack sync` retargets and rebases.

1. Merge PR 1 on GitHub:
   ```bash
   gh pr merge 1 --squash --delete-branch
   ```

2. Run `/stack sync`

**Expected:**
- Detects PR 1 is merged
- Retargets PR 2 base to `main`: `gh pr edit 2 --base main`
- Rebases branch 2 onto `origin/main`
- Cascades rebase to branch 3
- Removes merged branch from stack JSON
- Updates stack comments on remaining PRs
- Local merged branch deleted

**Verify:**
```bash
cat ~/.claude/stacks/stack-test.json  # should show 2 branches
gh pr view 2 --json baseRefName       # should be "main"
git branch                            # merged branch should be gone
```

---

## Test 11: Retroactive Stack Create

**Goal:** `/stack create --from` registers existing branches into a new stack.

1. Create some loose branches:
   ```bash
   git checkout main && git pull
   git checkout -b doug/quick-fix/1-typo && echo "// fixed" >> src/index.ts && git add . && git commit -m "fix: typo"
   git checkout -b doug/quick-fix/2-lint && echo "// cleaned" >> src/utils/flatten.ts && git add . && git commit -m "fix: lint"
   git push origin doug/quick-fix/1-typo doug/quick-fix/2-lint
   ```

2. Create PRs manually:
   ```bash
   gh pr create --base main --head doug/quick-fix/1-typo --title "fix: typo" --body "quick fix"
   gh pr create --base doug/quick-fix/1-typo --head doug/quick-fix/2-lint --title "fix: lint" --body "quick fix"
   ```

3. Retroactively register:
   ```
   /stack create quick-fix --from doug/quick-fix/1-typo doug/quick-fix/2-lint
   ```

**Expected:**
- Stack created with both branches
- Existing PRs discovered and recorded in JSON
- No new branches or PRs created

---

## Test 12: Multiple Concurrent Stacks

**Goal:** Verify two stacks coexist.

After test 11, you should have two stacks: `add-themes` (2 remaining branches) and `quick-fix` (2 branches).

```
/stack
```

Should list both stacks if not on a stack branch, or show the active one if on a stack branch.

---

## Cleanup

When done testing:

```bash
# Delete the GitHub repo (needs delete_repo scope)
gh repo delete dugshub/tempo-design-tokens --yes

# Remove local
rm -rf /Users/dug/Projects/sandbox/stack-test

# Remove stack state
rm ~/.claude/stacks/stack-test.json
```

---

## Success Criteria

- [ ] Stack JSON created and maintained correctly through all operations
- [ ] PRs created with correct base branches (stacked, not all against main)
- [ ] Stack comments posted on every PR with correct table
- [ ] Restack cascades cleanly through all downstream branches
- [ ] Sync correctly retargets after merge and cleans up
- [ ] Nav moves between branches correctly
- [ ] Retroactive create discovers existing PRs
- [ ] Multiple stacks coexist without interference
