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
