# Insourcing skills from public repos

This directory drives a reusable pipeline that vendors skills from public
upstream repositories into the plugin and keeps them up to date — while you
stay in control of what lands.

## How it works

```
sources/sources.json   ─┐
                        ├─►  scripts/sync-skills.mjs  ─►  plugins/skills/skills/<name>/   (flat, discoverable)
                        │                                 licenses/<id>-LICENSE.txt
                        │                                 licenses/NOTICE.md   (generated)
                        │                                 vendor.lock.json     (generated manifest)
```

- **`sources/sources.json`** — the source-of-truth list of upstreams + rules.
- **`scripts/sync-skills.mjs`** — clones each upstream at its ref, copies the
  declared skills, regenerates the NOTICE, the per-source LICENSE files, and
  `vendor.lock.json`. Zero npm dependencies; Node 18+ and `git`.
- **`vendor.lock.json`** — generated manifest recording, per skill: which source
  it came from, its upstream path, the pinned commit, a content hash, and
  whether it's `orphaned`.

Skills must live exactly one level deep (`skills/<name>/SKILL.md`) for Claude
Code to discover them, so provenance is tracked in the lockfile/NOTICE, **not**
in the directory tree.

## Golden rules

1. **Vendored skills are read-only mirrors.** They are overwritten on every
   sync. Never edit one in place — to customize, fork it into your own skills
   area under a *different* name so the sync leaves it alone.
2. **Nothing merges automatically.** The sync opens a PR; you review and merge.
3. **New skills are gated.** A skill not seen before is labeled
   `needs-security-review`; a Claude security review runs before you approve.
   The review may end in an `exclude` entry instead of a merge.
4. **Skills removed upstream are kept, not deleted** — they become `orphaned`
   in the lock (this is how `caveman`, `write-a-skill`, `zoom-out` survive).

## Run it locally

```bash
node scripts/sync-skills.mjs          # sync, write files
node scripts/sync-skills.mjs --check  # report what would change, write nothing
```

## Add a new source

Append an object to `sources[]` in `sources.json`.

**Multi-skill repo** (many skills under a root, e.g. mattpocock/skills):

```json
{
  "id": "someorg",
  "name": "someorg/skills",
  "repo": "https://github.com/someorg/skills",
  "ref": "main",
  "homepage": "https://github.com/someorg/skills",
  "license": { "spdx": "MIT", "holder": "Some Org", "file": "LICENSE" },
  "layout": "multi",
  "skillsRoot": "skills",
  "exclude": ["deprecated", "category/specific-skill"]
}
```

**Single-skill repo** (the whole repo is one skill, `SKILL.md` at root, e.g.
karpathy-llm-wiki):

```json
{
  "id": "cool-skill",
  "name": "owner/cool-skill",
  "repo": "https://github.com/owner/cool-skill",
  "ref": "main",
  "homepage": "https://github.com/owner/cool-skill",
  "license": { "spdx": "MIT", "holder": "Author Name", "file": "LICENSE" },
  "layout": "single",
  "skillName": "cool-skill",
  "copyIgnore": [".git", "LICENSE", "README.md"]
}
```

### Field reference

| Field | Applies to | Meaning |
|---|---|---|
| `id` | all | Stable short id; names the `licenses/<id>-LICENSE.txt` file. |
| `name` | all | Human label shown in NOTICE. |
| `repo` / `ref` | all | Upstream URL and branch/tag/commit to pin. |
| `license` | all | `spdx`, `holder`, and the `file` to copy verbatim from upstream. |
| `layout` | all | `multi` or `single`. |
| `skillsRoot` | multi | Directory to scan for `*/SKILL.md`. |
| `exclude` | multi | Paths within `skillsRoot` to skip (`cat` skips `cat/*`). |
| `orphans` | multi | Skills removed upstream but kept & attributed locally. |
| `skillName` | single | Destination directory name for the one skill. |
| `path` | single | Subdirectory holding `SKILL.md`, if not the repo root. |
| `copyIgnore` | single | Top-level entries to skip when copying the tree. |

> Two sources must not contribute the same skill directory name — the sync
> fails loudly on a collision. Resolve by excluding one or renaming via config.

## Attribution

`licenses/NOTICE.md` is regenerated on every sync — never edit it by hand.
Edit attribution by changing the `license`/`name` fields in `sources.json`.
