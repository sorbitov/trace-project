# GitHub Publication Checklist

The repository is prepared locally. Do not publish until the owner and repository name are confirmed.

## Before creating the repository

- [ ] Confirm the GitHub owner or organization.
- [ ] Confirm the repository name, recommended: `pact-arc`.
- [ ] Decide whether the repository will use `master` as-is or rename it to `main`.
- [ ] Confirm that `data/ppt.txt`, `.env`, private keys, OAuth tokens, and database exports are not tracked.
- [ ] Replace team and security contact placeholders with accountable facts.
- [ ] Review [known issues](known-issues.md) and keep every unresolved limitation public.

## Local verification

```powershell
git status --short
npm ci
npm test
npm audit --audit-level=high
npm run check
git tag --list
```

Expected release tag: `v0.1.0-rc.2`.

## Commands to run only after approval to publish

Create an empty GitHub repository without generated README, license, or `.gitignore`, then run:

```powershell
git remote add origin https://github.com/OWNER/pact-arc.git
git push -u origin master
git push origin v0.1.0-rc.2
```

If the default branch is renamed to `main`, rename it locally before the first push and replace `master` in the command above.

## After publishing

- [ ] Confirm the CI workflow passes on GitHub.
- [ ] Enable private vulnerability reporting and Dependabot alerts.
- [ ] Add the repository URL to README and the hackathon submission.
- [ ] Create a GitHub release from `v0.1.0-rc.2` using `docs/release-notes-v0.1.0-rc.2.md`.
- [ ] Protect the default branch and require the CI check before merge.
- [ ] Confirm explorer, demo, video, team, and program links before filing the hackathon form.
