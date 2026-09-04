# TaskSheet Versioning and Git Release Policy

TaskSheet uses Semantic Versioning.

## Version format

Stable releases:

`MAJOR.MINOR.PATCH`

Examples:

- `1.0.0`
- `1.1.0`
- `1.1.1`

Prereleases:

- `1.0.0-alpha.1`
- `1.0.0-beta.1`
- `1.0.0-rc.1`

Git tags use a `v` prefix:

- `v1.0.0`
- `v1.0.0-rc.1`

## Meaning

- **MAJOR** — incompatible product or data-contract changes.
- **MINOR** — backward-compatible feature additions.
- **PATCH** — backward-compatible bug fixes and hardening.
- **RC** — release candidate awaiting final validation.

## Branch strategy

- `main` — release-ready integration branch.
- `feature/<name>` — feature work.
- `fix/<name>` — bug fixes.
- `release/<version>` — optional stabilization branch for a release candidate.

Avoid committing directly to `main` for non-trivial work when branch/PR workflow is practical.

## Commit guidance

Use clear conventional-style commit prefixes where practical:

- `feat:` new product capability
- `fix:` bug fix
- `docs:` documentation only
- `refactor:` internal restructuring without intended behavior change
- `test:` tests only
- `build:` packaging/build tooling
- `chore:` maintenance

Examples:

- `feat: add huddle follow-up actions`
- `fix: preserve original due date on carry-forward`
- `docs: update print design standard`

## Release checklist

Before tagging any release or release candidate:

1. Working tree is clean.
2. App/package/runtime version identifiers are synchronized.
3. `CHANGELOG.md` is updated.
4. Typecheck passes.
5. Lint passes.
6. Full unit/component test suite passes.
7. Playwright/E2E passes.
8. Production build succeeds.
9. Packaged application smoke test succeeds when applicable.
10. Protected operational printouts pass print-preview regression checks.
11. Physical print validation is completed for release gates that require it.
12. Backup/restore compatibility is verified when schema/persistence changed.
13. Demo / Real / Empty mode behavior is verified when operational data logic changed.

## Release procedure

Recommended flow:

1. Create a release branch if stabilization work is needed.
2. Update version identifiers.
3. Update `CHANGELOG.md`.
4. Run the full verification suite.
5. Commit with a release-preparation message, e.g. `chore: prepare 1.0.0-rc.2`.
6. Merge through PR into `main`.
7. Tag the exact release commit, e.g. `v1.0.0-rc.2`.
8. Build/package from the tagged commit.
9. Record release evidence and checksums where applicable.

## Release discipline

A tag should identify immutable source for a release artifact. Do not move or reuse a published release tag. If a release candidate is found defective, create the next candidate rather than modifying the old tag.

## Version source of truth

The repository should maintain one clearly identifiable application version and keep any duplicated version metadata synchronized. If the codebase currently contains multiple version fields, release verification must check all of them before tagging.
