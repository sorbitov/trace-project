# Security Policy

## Supported versions

Security fixes currently target the latest commit on the default branch. No public production release is supported yet.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use the repository host's private security-advisory channel and include:

- affected commit and component;
- reproduction steps or proof of concept;
- expected impact and prerequisites;
- whether testnet funds or credentials may be at risk;
- a safe way to contact the reporter.

The project owner must acknowledge the report, assign severity and an owner, preserve evidence, and coordinate disclosure only after a fix and regression test are available. A named security contact and response-time commitment must be added before public testnet promotion.

## Scope boundary

The current repository is a testnet-ready MVP, not an audited production system. X account compromise, wallet compromise, Arc/RPC failures, hosting infrastructure, managed secrets, PostgreSQL operations, and third-party token behavior remain important external assumptions.
