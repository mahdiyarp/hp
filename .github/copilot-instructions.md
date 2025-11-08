## Purpose
This file guides AI coding agents (Copilot / automation) on how to be immediately productive in this repository.

## Current repository snapshot
- The repository is minimal and currently contains only `README.md` (top-level header `# hp`).
- No language, build, test, or CI configuration files were found during an initial scan.

Because the codebase is empty/minimal, most helpful agent actions require explicit user direction. Follow the steps below.

## When this file exists already
- Preserve any pre-existing content. If you update, merge intelligently: keep the user's original guidance at the top and append any new, verifiable facts you discovered.

## How to proceed (actionable checklist)
1. Reconfirm scope with the user before adding significant files: ask which language/runtime, target platform, and main objective (library, service, CLI, website, etc.).
2. If asked to scaffold a project, create a minimal scaffold for the chosen stack and include:
   - a manifest (e.g., `package.json` / `pyproject.toml` / `go.mod`),
   - a short `README.md` update describing how to build/run/test,
   - a minimal test and a GitHub Actions workflow (optional — only with user approval).
3. When editing files, include a short commit message and create a feature branch named `copilot/<short-purpose>`.

## What to look for in this repo
- `README.md`: currently the only file present. Use it as the canonical project-level description if the user updates it.
- Look for newly added files after scaffolding to discover build/test/CI commands (for example `package.json` scripts or `Makefile`).

## Merge/PR behaviour
- Do not open PRs without explicit user permission. When preparing a PR, include a short description of what you changed and why, plus instructions for how to run and verify locally.

## Minimal “contract” for agent changes
- Inputs: explicit user instruction (language/stack + goal) and permission to create files.
- Outputs: small, working scaffold or focused change, updated `README.md`, 1-2 unit tests, and an optional GitHub Actions workflow if requested.
- Success criteria: repository contains runnable build/test commands and a README section explaining how to reproduce results locally.

## Examples of allowed small tasks (ask first)
- Add a Python package skeleton with `pyproject.toml` and a pytest test.
- Add a Node.js skeleton with `package.json`, a `test` script, and a GitHub Actions workflow that runs `npm test`.

## When to stop and ask questions
- If any of the following are unknown: target language, runtime version, expected CI provider, or deployment target — pause and ask the user.

## Contact / follow-up
After making any non-trivial change, ask the user these three quick questions:
1. Is this the right language/stack? 2. Are these build/test commands acceptable? 3. Should I add CI/workflows?

---
If you'd like, I can now: (A) create a minimal scaffold for a language you pick, (B) expand `README.md` with setup instructions, or (C) wait for your explicit tasks and constraints.
