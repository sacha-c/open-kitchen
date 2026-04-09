---
name: feature-workflow
description: Standard workflow for implementing features from GitHub issues. MUST be followed whenever working on a feature, bug fix, or any issue-driven task.
---

# Feature Implementation Workflow

## Process

### 1. Understand the task

- Fetch the GitHub issue with `gh issue view <number> --repo sacha-c/open-kitchen` (pipe through `| head -N` to avoid pager).
- Read the entire issue: summary, requirements, technical notes, dependencies, testing, acceptance criteria.
- If there are **unresolved dependencies** (`Depends on #N` where #N is still open), stop and tell the user. Do not start work on an issue with open dependencies.

### 2. Assess current state

- Read the files and areas of the codebase that the issue touches.
- Compare what already exists against what the issue requires.
- Identify what needs to be created vs modified.

### 3. Implement

Follow these principles:

- **Simplicity over cleverness.** Write code a junior dev can read.
- **SOLID principles.** Single responsibility, dependency inversion, etc. — but don't create abstractions for things that are used once.
- **Type safety.** Use TypeScript types everywhere. Parse > validate (use Zod or similar to parse inputs at system boundaries). Never use `any`.
- **No overengineering.** Don't add layers, wrappers, or indirection that aren't needed yet.
- **Uncoupled.** Keep modules independent. Pass dependencies explicitly. Avoid singletons and globals where possible.
- **Follow existing patterns.** Match the style, naming, and structure already in the codebase.

### 4. Test

- **Unit tests are mandatory.** Every feature must have Vitest unit tests.
- **Skip Playwright E2E tests** for now (unless explicitly requested).
- Run tests with the VSCode test runner task (`UNIT TESTS`).
- Iterate until all tests pass and there are no lint errors.
- Remember: `requireAssertions: true` is set in vitest config — every test must have at least one assertion.

### 5. Commit & PR

- Use **conventional commits** for all commit messages and the PR title:
  - `feat: add recipe creation form`
  - `fix: handle null image URL in sync`
  - `refactor: extract Cecotec auth into separate module`
  - `test: add unit tests for recipe validation`
  - `chore: update dependencies`
- Create a PR with `gh pr create`:
  - **Title**: conventional commit format.
  - **Body**: extensively document your approach — what was done, why, any decisions made, trade-offs.
  - **Link to the issue**: include `closes #N` if the PR fully resolves the issue, or `Relates to #N` if it's partial.
- Pipe `gh` commands through `| cat` to avoid pager issues.

### 6. Verify CI is green

- After pushing, **always check that CI passes** before considering the task done.
- Use `gh pr checks <PR-number> --repo sacha-c/open-kitchen` (redirect to a file or pipe through `| cat`) to monitor CI status.
- If any job fails, fetch the failure logs with `gh run view <run-id> --repo sacha-c/open-kitchen --job <job-id> --log-failed` and diagnose.
- Fix failures, commit, push, and re-check. **Iterate until all CI jobs are green.**
- Do not hand back to the user with a red pipeline — a PR is not done until CI passes.

## Quick Reference

```bash
# Fetch issue
gh issue view 42 --repo sacha-c/open-kitchen | cat

# Create branch
git checkout -b feat/short-description

# After implementation + tests passing
git add -A
git commit -m "feat: description of change"

# Create PR
gh pr create --title "feat: description of change" --body "..." | cat
```
