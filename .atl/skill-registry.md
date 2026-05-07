# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review | branch-pr | /home/ivanj/.config/opencode/skills/branch-pr/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | /home/ivanj/.config/opencode/skills/skill-creator/SKILL.md |
| When writing Go tests, using teatest, or adding test coverage | go-testing | /home/ivanj/.config/opencode/skills/go-testing/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | /home/ivanj/.config/opencode/skills/issue-creation/SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | /home/ivanj/.config/opencode/skills/judgment-day/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue (needs `status:approved` label)
- Every PR MUST have exactly one `type:*` label
- Branch naming: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`
- PR template at `.github/PULL_REQUEST_TEMPLATE.md` — must include linked issue, type checkbox, summary, changes table
- Automated checks must pass before merge is possible

### skill-creator
- Create skill in `skills/{skill-name}/SKILL.md` following Agent Skills spec
- Frontmatter: name, description (with `Trigger:`), license Apache-2.0, metadata (author, version)
- Structure: When to Use, Critical Patterns, Code Examples, Commands, Resources
- Don't create skills for trivial patterns, one-off tasks, or existing documentation
- Naming: `{technology}`, `{project}-{component}`, `{action}-{target}`

### go-testing
- Use table-driven tests for multiple test cases (standard Go pattern)
- Bubbletea TUI: test Model state transitions directly; use teatest for interactive flows
- Golden file testing for complex outputs that are hard to assert inline
- Coverage: `go test -cover`, `go test -coverprofile=coverage.out`
- Run: `go test ./...`, or `go test -run TestName ./path/to/package`

### issue-creation
- Blank issues disabled — MUST use template (`.github/ISSUE_TEMPLATE/bug_report.yml` or `feature_request.yml`)
- Every issue auto-labeled `status:needs-review`; maintainer must add `status:approved` before PRs
- Questions → Discussions, not issues
- Pre-flight: check no duplicate + understands approval workflow
- Bug report: OS dropdown, Agent/Client dropdown, Shell dropdown, steps to reproduce

### judgment-day
- Launches TWO independent blind sub-agents in parallel via `delegate` (never sequential)
- Judges work independently — neither knows about the other; orchestrator synthesizes verdict
- Verdict: confirmed (both found), suspect (only one), contradiction (disagree), theoretical (contrived)
- Warning classification: real (causes bug in normal use) vs theoretical (requires malicious/corrupted input)
- Fix + re-judge: max 2 iterations, then escalate; 0 criticals + 0 real warnings = APPROVED

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| AGENTS.md | /home/ivanj/Desktop/proyectos/iconium-core/AGENTS.md | Project guidelines: code style, naming conventions, git/commits (Spanish), docs, testing |
| PROFESSOR.md | /home/ivanj/Desktop/proyectos/iconium-core/PROFESSOR.md | Teaching philosophy: concept before code, strict corrections, Socratic method |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
