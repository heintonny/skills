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

## License & attribution

Own skills/agents/commands are Hein's own. A curated set of skills is vendored
from **[mattpocock/skills](https://github.com/mattpocock/skills)** (MIT) and may
be locally adapted. The MIT attribution lives in [`licenses/`](./licenses/) — see
[`NOTICE.md`](./licenses/NOTICE.md) for which skills it covers.

## How this fits the rest of the setup

The setup is split into three layers by sensitivity:

| Layer | Home | Visibility |
|---|---|---|
| Own generic skills/agents/commands | **this repo** (`heintonny/skills`) | public |
| CLAUDE.md guardrails (shared + per-host) | `heintonny/agent-system-admin` | private |
| Dotfiles (`settings.json`, statusline, keybindings) | `heintonny/dotsmith` | private |
| External skills | `mattpocock/skills` (upstream) | external |

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
