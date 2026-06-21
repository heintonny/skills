---
name: commit
description: Stage all changes and create a perfect conventional commit message based on the diff
allowed-tools: Bash(git *)
---

Stage all changes and create a well-crafted git commit.

## Steps

1. Run `git status` to see the current state.
2. Run `git add .` to stage all changes.
3. Run `git diff --cached` to inspect exactly what is staged.
4. Run `git log --oneline -5` to understand the commit style used in this repo.
5. Craft a commit message following these rules:
   - Use Conventional Commits format: `type(scope): short description`
   - Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `ci`
   - Subject line: imperative mood, max 72 chars, no trailing period
   - If the change is non-trivial, add a concise body (blank line after subject) explaining *why*, not *what*
   - Do NOT mention Claude or AI in the message
6. Create the commit. Pass the message via heredoc to preserve formatting:
   ```
   git commit -m "$(cat <<'EOF'
   <subject line>

   <optional body>

   Co-Authored-By: <your model name, e.g. "Claude Opus 4.6 (1M context)" or "Claude Sonnet 4.6"> <noreply@anthropic.com>
   EOF
   )"
   ```
7. Run `git log --oneline -1` to confirm the commit was created.

## Rules

- Never skip hooks (`--no-verify`)
- Never amend existing commits unless explicitly asked
- If `$ARGUMENTS` is provided, use it as a hint or override for the commit message
