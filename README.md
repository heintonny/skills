# heintonny/skills

Hein Tonny Køien's personal **Claude Code marketplace** — own skills, agents and
commands, packaged as a plugin so they can be installed and enabled identically
across Mac, PC and VM via the built-in `claude plugin` system.

| | |
|---|---|
| **Marketplace name** | `heintonny` |
| **Plugin name** | `skills` |
| **Install** | `claude plugin install skills@heintonny` |

## Quick start on a new machine

Auth-free (this repo is public):

```bash
claude plugin marketplace add heintonny/skills
claude plugin install skills@heintonny
```

Or run the bootstrap script:

```bash
git clone https://github.com/heintonny/skills.git
cd skills && ./bootstrap.sh
```

## What the plugin contains

```
plugins/skills/
├── agents/      # macos-dev-environment-manager
├── commands/    # /commit
└── skills/      # own skills + a curated set vendored from mattpocock/skills
```

The skills directory includes, among others, engineering (`tdd`, `diagnosing-bugs`,
`codebase-design`, `domain-modeling`, `implement`, `improve-codebase-architecture`,
`resolving-merge-conflicts`, `prototype`, `review`), issue/planning workflow
(`to-issues`, `to-prd`, `triage`, `grill-with-docs`, `grill-me`, `grilling`,
`decision-mapping`, `handoff`), skill authoring (`writing-great-skills`,
`write-a-skill`) and assorted tooling.

## Insourced skills

Own skills/agents/commands are Hein's own. Skills are also vendored from public
upstream repos and kept up to date by a config-driven pipeline — see
[`sources/`](./sources/). Current upstreams:
**[mattpocock/skills](https://github.com/mattpocock/skills)** and
**[Astro-Han/karpathy-llm-wiki](https://github.com/Astro-Han/karpathy-llm-wiki)**
(both MIT).

Vendored skills are **read-only mirrors** — never edit them in place; they're
overwritten on every sync. To customize one, fork it under a different name. A
weekly GitHub Action opens a PR with updates and new skills; nothing merges
automatically, and brand-new skills get a Claude security review first. Generated
attribution lives in [`licenses/NOTICE.md`](./licenses/NOTICE.md).

## How this fits the rest of the setup

The setup is split into three layers by sensitivity:

| Layer | Home | Visibility |
|---|---|---|
| Own generic skills/agents/commands | **this repo** (`heintonny/skills`) | public |
| CLAUDE.md guardrails (shared + per-host) | `heintonny/agent-system-admin` | private |
| Dotfiles (`settings.json`, statusline, keybindings) | `heintonny/dotsmith` | private |
| Insourced skills | public upstreams (declared in [`sources/`](./sources/)) | external |

Host-specific or sensitive content does **not** belong here — it lives in the
private repos.

## Adding a new own skill

1. Create a folder under `plugins/skills/skills/<name>/` with a `SKILL.md`.
2. Bump `version` in `plugin.json` and `marketplace.json`.
3. Commit + push.
4. On each machine: `claude plugin update skills@heintonny`.

## Maintenance

```bash
claude plugin list                       # what is installed
claude plugin update skills@heintonny    # pull the latest version
claude plugin marketplace list           # registered marketplaces
```
