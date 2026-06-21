# heintonny/skills

Hein Tonny Køiens personlige **Claude Code marketplace** — egne skills, agents og
commands, pakket som en plugin slik at de kan installeres og enables identisk på
tvers av Mac, PC og VM via det innebygde `claude plugin`-systemet.

| | |
|---|---|
| **Marketplace-navn** | `heintonny` |
| **Plugin-navn** | `skills` |
| **Install** | `claude plugin install skills@heintonny` |

## Hurtigstart på ny maskin

Auth-fritt (dette repoet er public):

```bash
claude plugin marketplace add heintonny/skills
claude plugin install skills@heintonny
```

Eller kjør bootstrap-scriptet som også setter opp eksterne skills:

```bash
git clone https://github.com/heintonny/skills.git
cd skills && ./bootstrap.sh
```

## Hva pluginen inneholder

```
plugins/skills/
├── agents/      # macos-dev-environment-manager
├── commands/    # /commit
└── skills/      # (egne skills legges til her over tid)
```

## Hvordan dette henger sammen med resten av oppsettet

Oppsettet er delt i tre lag etter følsomhet:

| Lag | Hjem | Synlighet |
|---|---|---|
| Egne generiske skills/agents/commands | **dette repoet** (`heintonny/skills`) | public |
| CLAUDE.md guardrails (felles + per-host) | `heintonny/agent-system-admin` | private |
| Dotfiles (`settings.json`, statusline, keybindings) | `heintonny/dotsmith` | private |
| Eksterne skills | `mattpocock/skills` (upstream) | ekstern |

Host-spesifikt eller sensitivt innhold hører **ikke** hjemme her — det ligger i
de private repoene.

## Legge til en ny egen skill

1. Lag mappe under `plugins/skills/skills/<navn>/` med en `SKILL.md`.
2. Commit + push.
3. På hver maskin: `claude plugin update skills@heintonny`.

## Vedlikehold

```bash
claude plugin list                       # hva er installert
claude plugin update skills@heintonny    # hent siste versjon
claude plugin marketplace list           # registrerte marketplaces
```
