# Known Issues and Limitations

This repository is a release candidate for Arc Testnet review, not an audited production release.

- Arcscan source verification is still pending; deployed bytecode and configuration were verified through Arc RPC.
- Owner, verifier, treasury, and deployer currently use the same testnet wallet. These roles must be separated before production.
- The application has not yet been published at an HTTPS URL.
- Real two-account X OAuth acceptance testing and a clean-browser reviewer walkthrough remain pending.
- No independent smart-contract or application security review has been completed.
- The canonical `handlepay.app` URL is retained as a placeholder until a PACT domain is selected and controlled.
- The deployed Solidity artifact remains named `HandlePaymentEscrow`; renaming it would require a new deployment and is intentionally outside this branding-only release.
- PostgreSQL, managed application secrets, monitored RPC access, and operational alerting are required for a hosted environment.
- The current deployment is Arc Testnet only and uses testnet USDC.

See [project status](project-status.md), [security model](security.md), and [submission checklist](submission-checklist.md) for the complete evidence boundary.
