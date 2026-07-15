# PACT v0.1.0-rc.2

PACT — Programmable Arc Conditional Transfers — lets a sender escrow USDC on Arc for an X identity. The intended recipient proves the X account and a destination wallet before claiming; the sender retains contract-enforced cancellation and expired-refund paths.

## Evidence in this release

- Arc Testnet contract: `0x5A3949aE67a37e7e37bFC77F5b7832Cc93f40A2a`
- Deployment block: `51929589`
- Live create/claim, create/cancel, and create/refund lifecycle evidence in `deployments/arc-testnet.json`
- 37 automated API, wallet, identity, security, and Solidity tests
- MIT license, CI workflow, security policy, architecture, deployment, demo, and DeFi Track submission documents

## Release boundary

This is a testnet release candidate. Arcscan source verification, HTTPS hosting, real two-account X OAuth acceptance testing, role separation, external security review, team details, and the final hackathon URL/video package remain pending.

Do not use this release with production funds.
