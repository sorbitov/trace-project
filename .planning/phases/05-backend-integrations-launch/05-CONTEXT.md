# Phase 5 Context: Backend, Integrations, and Testnet Launch Loop

## Goal

Operate the tested application in a public HTTPS testnet environment with PostgreSQL, X OAuth and lookup, an event indexer, monitoring, reviewer identities, and repeatable acceptance evidence.

## Current boundary

The repository implementation exists. Production hosting, managed secrets, `X_BEARER_TOKEN`, deployed database, real two-account X/wallet testing, public CI/release evidence, and operational ownership are still required.

## Required external inputs

- Hosting and PostgreSQL account.
- Production domain and exact X callback URL.
- X bearer token and two controlled X identities.
- Two funded Arc Testnet user wallets.
- Named operations/security owners and grant-program facts.
