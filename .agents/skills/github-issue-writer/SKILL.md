---
name: github-issue-writer
description: Skill for writing consistent, self-sufficient GitHub issues for the OpenKitchen project. Use this whenever creating GitHub issues to ensure they follow the project's conventions.
---

# GitHub Issue Writer

## Issue Template

Every issue MUST follow this structure:

```markdown
## Summary

One or two sentences describing what this issue accomplishes. Written so that a developer (human or AI) can fully understand the scope without reading other issues.

## Context

Brief background on why this is needed. Reference the relevant part of the system (Cecotec API, DB schema, UI, etc.). Include links to AGENTS.md sections or other issues only when truly necessary.

## Requirements

A numbered list of concrete, verifiable requirements. Each item should be testable.

1. Requirement one
2. Requirement two
3. ...

## Technical Notes

- Specific files, endpoints, libraries, or patterns to use.
- Any constraints (e.g., "must use Drizzle ORM", "must encrypt password with RSA").
- Reference to existing code or schema when relevant.

## Dependencies

- List issues this depends on, using `Depends on #N` syntax. If none, write "None".

## Testing

- Specific test scenarios that MUST be implemented.
- Include both unit tests (Vitest) and E2E tests (Playwright) where applicable.
- An issue is not complete until its tests pass.

## Acceptance Criteria

- [ ] Checkbox list of what "done" looks like.
- [ ] Tests written and passing.
```

## Rules

1. **Self-sufficient**: Every issue must contain enough context for a developer to work on it independently. Don't assume the reader has read other issues.
2. **Atomic**: Each issue is the smallest unit of work that can be tested and delivers value. If an issue can be split further and each part is independently testable, split it.
3. **Independent**: Issues can generally be worked on in parallel. When dependencies exist, they are explicitly marked with `Depends on #N`.
4. **Testable**: Every issue includes concrete test requirements. Both unit and integration/E2E tests where appropriate.
5. **Labels**: Use appropriate labels: `feature`, `investigation`, `infrastructure`, `ui`, `api`, `database`.
6. **Title format**: Use imperative mood, e.g., "Add recipe creation form" not "Recipe creation form" or "Adding recipe creation form".

## CLI Usage

Create issues using `gh`:

```bash
gh issue create --title "TITLE" --body "BODY" --label "label1,label2"
```
