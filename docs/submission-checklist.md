# HandleLayer Grant Submission Checklist

Use this as the final truth and completeness gate. A checked item should have a link or named evidence owner, not only a verbal confirmation.

## 1. Program fit

- [ ] Grant program name, application URL, deadline, timezone, and decision date recorded
- [ ] Eligibility confirmed for applicant jurisdiction, entity type, project stage, and requested cost categories
- [ ] Funding cap, currency, tax treatment, milestone/payment schedule, and reporting obligations confirmed
- [ ] Intellectual-property and open-source requirements reviewed
- [ ] Every answer is within the form's word/character limit
- [ ] Program-specific language replaces generic references to “the grant”
- [ ] Conflicts of interest, prior funding, token/equity terms, and exclusivity questions answered

## 2. Applicant and team — required facts

- [ ] Legal applicant name and type
- [ ] Jurisdiction, registered address, and registration number if applicable
- [ ] Accountable project lead name, email, X, GitHub/LinkedIn, location, and weekly commitment
- [ ] Protocol/backend lead experience and two relevant proof links
- [ ] Product/design lead experience and portfolio/proof links
- [ ] Security/operations owner and external review procurement plan
- [ ] Contributor role, deliverables, and weekly commitment listed for every person
- [ ] Payment/tax/KYC information prepared for private program channels
- [ ] Team biographies are factual and do not claim unverified employers, launches, users, or revenue

## 3. Application narrative

- [ ] One-line, 50-word, 150-word, and full descriptions are consistent
- [ ] Problem is stated without unsupported market statistics
- [ ] Product flow explains sender, recipient, X proof, wallet proof, escrow, and recovery
- [ ] Arc is justified technically and strategically
- [ ] Current implementation is separated from proposed work
- [ ] Differentiation is specific and does not disparage unnamed competitors
- [ ] Privacy language distinguishes API metadata from public chain data
- [ ] Sustainability section avoids unproven revenue claims
- [ ] Risks include X, verifier, contract, RPC/indexer, privacy, and legal dependencies
- [ ] Final reviewer closing statement matches the program's evaluation criteria

## 4. Milestones and budget

- [ ] Proposed 16-week plan is compatible with the grant period
- [ ] Total request is confirmed or adjusted from the $75,000 planning baseline
- [ ] M1/M2/M3 amounts sum to the total request
- [ ] Category allocation sums to 100%
- [ ] Rates, vendor quotes, taxes, and contingency comply with eligible-cost rules
- [ ] Every milestone has deliverables, objective acceptance criteria, and evidence
- [ ] Security-review budget and reviewer availability are credible
- [ ] Tester incentives have eligibility, consent, and payment rules
- [ ] Budget change-control and reporting cadence are accepted by the team
- [ ] Co-funding, prior grants, or in-kind contribution is disclosed where required

## 5. Repository and quality evidence

- [ ] Public repository URL added
- [ ] License selected and `LICENSE` file committed
- [ ] README setup works from a clean environment
- [ ] Release tag created for submission
- [ ] CI runs `npm test`, `npm audit`, and `npm run check`
- [ ] Test output link shows API, security, and contract suites passing
- [ ] Secrets scan is clean; `.env` and keys are absent from history
- [ ] Dependency lockfile committed
- [ ] Known issues and unsupported configurations published
- [ ] Architecture, security, deployment, pilot, status, and demo documents linked

## 6. Arc deployment evidence

- [ ] Contract deployed to Arc Testnet
- [ ] Source verified in the Arc explorer
- [ ] Contract address, deployment transaction, block, chain ID, compiler settings, and constructor args published
- [ ] USDC, verifier, treasury, owner, minimum fee, and pause state match the manifest
- [ ] Deployer, owner, verifier, and treasury roles are separated
- [ ] Deployer key removed from application hosting
- [ ] Create, claim, cancel, and refund explorer links captured
- [ ] Indexer starts from deployment block and resumes from checkpoint
- [ ] Wrong-chain and receipt/event mismatch tests recorded

## 7. X and wallet identity evidence

- [ ] X application approved and least-privilege scopes documented
- [ ] Production callback exactly matches application configuration
- [ ] Privacy policy and terms links satisfy X application requirements
- [ ] X bearer-token storage and rotation owner assigned
- [ ] Handle lookup stores immutable X user ID
- [ ] Fresh recipient OAuth mismatch test recorded
- [ ] Wallet challenge expiry, one-time use, and wrong-wallet tests recorded
- [ ] Claim authorization context and expiry documented

## 8. Hosted demo and reviewer assets

- [ ] HTTPS demo URL and status page published
- [ ] Health endpoint reports required integrations ready
- [ ] Two controlled X identities and wallets are available for review
- [ ] Arc Testnet USDC/gas preparation documented
- [ ] Five-minute demo video published with captions
- [ ] Reviewer guide tested from a clean browser/device
- [ ] Evidence folder follows the demo guide structure
- [ ] Screenshots redact tokens, signatures, private memo, and personal data
- [ ] Contact channel is monitored during the review period

## 9. Security and operations

- [ ] Security document reviewed by the technical owner
- [ ] External-review scope and schedule confirmed
- [ ] Critical/high finding acceptance rule approved
- [ ] Full actor/endpoint/privacy matrix passes
- [ ] Managed signer/KMS path and rotation procedure defined before production
- [ ] Backup restore, indexer replay, RPC failure, X outage, pause/refund, and rollback exercises scheduled
- [ ] Alert ownership and severity targets documented
- [ ] Audit-log access, retention, and deletion policies documented
- [ ] Security contact and disclosure policy published
- [ ] Incident response owner and backup named

## 10. Pilot and data ethics

- [ ] Pilot cohort, consent, eligibility, duration, and incentive rules approved
- [ ] KPI definitions and exclusions frozen before data collection
- [ ] Analytics exclude memo, OAuth tokens, signatures, raw IP, and private payment fields
- [ ] Failure taxonomy implemented
- [ ] Participant support and escalation path staffed
- [ ] Stop conditions for security, privacy, custody confusion, and dependency failure approved
- [ ] Aggregated reporting protects participant identity
- [ ] Proceed/redesign/stop decision owner named

## 11. Legal and claims review

- [ ] Product model reviewed for target launch jurisdictions
- [ ] Terms, privacy notice, prohibited-use rules, and data processor list drafted
- [ ] “Non-custodial,” “private,” “secure,” and “verified” claims reviewed for accuracy
- [ ] No mainnet, audit, user, volume, revenue, or partnership claim lacks evidence
- [ ] X and Arc names/marks are used according to applicable policies
- [ ] Sanctions/eligibility and tester restrictions reviewed where applicable
- [ ] Applicant accepts residual risks and program representations

## 12. Final package index

- [ ] Grant application
- [ ] One-page executive summary
- [ ] Budget and milestones
- [ ] Pilot and impact plan
- [ ] Architecture
- [ ] Security model
- [ ] Project status/evidence matrix
- [ ] Roadmap
- [ ] Deployment guide
- [ ] Reviewer demo guide
- [ ] Repository, release, CI, and license links
- [ ] Live demo, status, contract, explorer, and video links
- [ ] Team bios and contact sheet
- [ ] Program-specific attachments and declarations

## Final truth review

Immediately before submission, search every document and form answer for `TEAM INPUT REQUIRED`, `REQUIRED`, placeholder URLs, bracketed names, unverified metrics, old contract addresses, wrong dates, and stale test counts. Have one technical owner and one non-author reviewer sign off on the exact submitted version.
