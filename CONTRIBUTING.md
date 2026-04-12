# Contributing

## Authorship and blame credit

This repository uses [`.git-blame-ignore-revs`](./.git-blame-ignore-revs) to keep line-level blame credit accurate after large mechanical refactors (for example mass file moves/splits/renames).

Set this once per local clone:

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

For code that was moved between files, use copy/move-aware blame:

```bash
git blame -w -M -C -C <path/to/file>
```

Notes:
- This does not rewrite commit history.
- Commit authorship stays unchanged.
- It improves practical line attribution in blame output.
- After merging a large mechanical refactor (mass renames/moves/reformat), append that commit hash to `.git-blame-ignore-revs` so future blame keeps credit on original contributors.

## Structural and naming conventions (conservative)

- Prefer minimal change over broad reorganization. Keep refactors incremental and scoped.
- Preserve the existing top-level structure: `apps/api`, `apps/web`, and `packages/shared`.
- Add new domain logic under existing feature roots (`apps/api/src/features/<domain>`, `apps/web/src/features/<domain>`) rather than creating parallel patterns.
- Keep route segments kebab-case and dynamic params descriptive (for example `[projectId]` instead of generic `[id]` when practical).
- Match naming style used by the local domain. Do not introduce a second alias for the same concept in the same scope.
- Keep directories scannable. When practical, split folders that grow beyond roughly 20-25 files into clear sub-concerns.
- If a path must change, prefer compatibility wrappers/re-exports first to reduce import and route breakage.
- Keep tests co-located with the code they validate.
- Use npm as the repository package manager unless the team explicitly decides to support another manager.
