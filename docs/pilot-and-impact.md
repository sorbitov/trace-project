# HandleLayer Pay Pilot and Impact Plan

## Research question

Can an identity-addressed claim flow make Arc USDC payments easier to initiate and safer to attribute than asking a recipient for a wallet address, without turning HandleLayer into a custodial balance system?

## Pilot scope

- Network: Arc Testnet
- Asset: testnet USDC
- Identity provider: X
- Payment model: sender-funded non-custodial escrow
- Lifecycle: create, fund, claim, cancel, expired refund
- Duration: six active pilot weeks inside the 16-week grant plan
- Cohort target: at least 100 consented participants
- Volume target: at least 250 funded payments

The pilot is not a public mainnet launch and should not be marketed as holding production funds.

## Participant groups

1. **Senders:** users who already understand wallets and can acquire Arc Testnet assets.
2. **Recipients:** users who receive a link and may have less familiarity with Arc.
3. **Creator/community operators:** users evaluating payments to known social identities at small scale.
4. **Adversarial testers:** reviewers asked to test wrong-account, wrong-wallet, expired, cancelled, and unrelated-session cases.

Recruitment should avoid minors and sanctioned or otherwise ineligible participants, subject to the final jurisdiction and program rules.

## Funnel and KPI definitions

| Metric | Definition | Pilot target |
| --- | --- | ---: |
| Intent-to-funded conversion | Unique valid payment intents that reach verified `pending` status / valid intents created | Establish baseline; report by failure category |
| Claim-start rate | Unique recipients who begin fresh X authentication / funded payments whose link was opened | Establish baseline |
| Claim completion | Verified claimed payments / recipients who started the claim flow | ≥80% |
| Active claim time | Median time from claim page open to claim transaction submission, excluding time away from the flow | ≤5 minutes |
| Terminal resolution | Claimed + cancelled + refunded payments / funded payments old enough to resolve | ≥90% by reporting cutoff |
| Privacy authorization accuracy | Unauthorized test cases that receive no private amount, sender, or memo / all unauthorized cases | 100% |
| Critical lifecycle integrity | Payments marked funded/settled only with matching verified Arc evidence | 100% |
| Comprehension | Participants correctly identify who holds funds, how to claim, and when refund is available | ≥90% |
| Support load | Human support conversations / completed payments | Report baseline and top causes |

Targets are success criteria for the proposed pilot, not measurements already achieved.

## Event instrumentation

Collect only what is necessary to evaluate the flow:

- pseudonymous session/profile identifier
- payment identifier
- lifecycle event name and timestamp
- client flow step and failure category
- Arc transaction hash for events already public on-chain
- request ID for support correlation
- coarse device/browser class

Do not put memo text, OAuth tokens, wallet signatures, raw IP addresses, X access tokens, or private payment fields into analytics. Audit-log IP values should remain keyed hashes used for abuse investigation, not product analytics.

Recommended event names:

- `payment_intent_created`
- `wallet_approval_submitted`
- `payment_funding_submitted`
- `payment_funding_verified`
- `claim_link_opened`
- `recipient_x_verified`
- `claim_wallet_verified`
- `claim_authorization_issued`
- `claim_submitted`
- `payment_claimed`
- `payment_cancelled`
- `payment_refunded`
- `flow_error`

## Failure taxonomy

Every failed flow should be assigned one primary category:

- user cancelled wallet request
- wrong wallet or chain
- insufficient USDC or gas balance
- X OAuth denied or state invalid
- X lookup unavailable or rate-limited
- recipient X account mismatch
- wallet proof invalid or expired
- payment expired or already settled
- Arc transaction reverted
- receipt/event mismatch
- RPC or indexer unavailable
- application defect
- unknown, pending investigation

## Test protocol

### Baseline task

Ask a participant to pay a known person using a wallet address supplied out of band. Measure steps, completion, address-verification behavior, confidence, and errors. Do not move production value.

### HandleLayer Pay task

Ask the same participant type to create a payment for an X handle. The recipient then claims to a wallet they control. Measure the same outcomes plus OAuth and claim friction.

### Safety tasks

Test wrong X account, wrong wallet, replayed authorization, unrelated session, expired link, cancelled payment, paused contract, RPC error, and indexer restart. Expected behavior is an explicit blocked action or recoverable state, never simulated success.

## Feedback questions

- Who did you believe would receive the funds, and why?
- At what point did you feel the payment became final?
- Who controlled the funds before claim?
- What happens if the recipient never claims?
- Which step felt least trustworthy or least understandable?
- Would you prefer entering a handle or requesting a wallet address for this use case?
- What evidence would you need before using the product with real value?

## Decision thresholds

Proceed to production-readiness work only if:

- no unresolved critical/high security finding remains
- authorization and receipt-verification tests pass completely
- the claim completion and comprehension targets are met or have a credible remediation plan
- support load is operationally manageable
- X and Arc dependencies remain viable
- the legal/compliance review does not prohibit the proposed launch model

Stop or redesign if users systematically misunderstand custody/refunds, identity mismatch occurs, private API data is exposed, chain evidence and database state diverge without recovery, or the verifier boundary cannot be operated safely.

## Final pilot report

The report should contain cohort description, consent method, exact metric definitions, funnel results, failure distribution, qualitative themes, security incidents, excluded data, limitations, product changes, cost summary, and a clear proceed/redesign/stop recommendation.
