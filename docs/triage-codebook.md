# Triage codebook (v1, 2026-11-24)

This is the rulebook for both the model and Ayad when labelling the 100 eval reviews. A review gets up to 2 categories (most important first) and one severity from 1 to 3. If a review is mostly something else, use `other`. The category list is fixed so banks can be compared.

Label what the reviewer wrote, not what you think the cause is. Ignore the star rating where it disagrees with the text (a 5 star review that says "embarrassingly poor" is a complaint).

## Categories

| Slug | Means | Example (made up in the style of the data) |
|---|---|---|
| `login_access` | Cannot sign in, OTP or SMS code not arriving, biometric or face check failing, locked out, device change or re-registration trouble | "Cannot log in since yesterday, OTP never comes" |
| `transfers_payments` | A transfer, bill payment, airtime or card payment fails, hangs on "processing", or is slow | "Transfer keeps saying transaction in progress" |
| `money_balance` | Money went missing or was debited without value, reversals not received, wrong or hidden balance, transaction history missing or wrong | "Debited twice and no reversal after 3 days" |
| `app_stability` | Crashes, freezes, slow to open or load, network error messages, downtime, app not working at all (without a clearer cause above) | "App keeps crashing when I open it" |
| `fees_charges` | Complaints about fees, stamp duty, SMS charges, deductions the reviewer thinks are wrong or too high | "Too many charges on every small transfer" |
| `ui_ux` | Design, layout, navigation, a new update that changed things, hard to find a feature, confusing screens | "The new interface is ugly, I preferred the old one" |
| `feature_request` | Asks for something the app does not have or should add (dark mode, statements, scheduled transfers) | "Please add fingerprint login" |
| `support` | Customer service, complaints not resolved, no reply, branch or call centre experience, disputes | "I reported this three weeks ago and nobody replied" |
| `security_fraud` | Worry or report of fraud, unauthorised access, account compromised, scam | "Someone accessed my account and moved money" |
| `praise` | Positive with no problem raised ("good app", "easy to use", "best bank") | "Easy to use and fast" |
| `other` | Gibberish, empty praise or complaint with no content, off-topic, not about the app or the bank | "Nice 👍" with nothing else; random letters |

### Tie-break rules
1. If a review names a concrete failure, use that failure's category, not `app_stability`. "Can't transfer, app is slow" is `transfers_payments` first and `app_stability` second.
2. `money_balance` beats `transfers_payments` when money has actually left the account or vanished. A transfer that failed with no money taken is `transfers_payments`.
3. `login_access` beats `app_stability` when the only thing the reviewer cannot do is sign in.
4. Mixed praise and complaint ("good app but crashes"): the complaint is the category; add `praise` only as a second category if it is a real part of the review.
5. Only one problem, one category. Use the second slot only when the review clearly raises a second, separate issue.
6. Unreadable, gibberish or decorative text: `other`, severity 1.

## Severity anchors

| Level | Means | Test |
|---|---|---|
| 1 | Annoyance | The reviewer is unhappy but could still do what they came to do. Includes praise and `other`. |
| 2 | Blocked a task | They could not complete something they tried (log in, transfer, see history) but there is no sign of money lost or being stuck for days. |
| 3 | Money lost, stuck or locked out | Money debited or missing, or they have been unable to use the account or app for a long time (days or more), or an urgent need failed. |

Anchors to calibrate on:
- "The app opens slowly": 1.
- "Can't make a transfer right now": 2.
- "Locked out for a week", "debited twice and no reversal", "can't access my money": 3.
- When torn between two levels, choose the lower one. Write the doubt in `notes`.

## What is deliberately not here
- No sentiment label; the star rating and the categories carry that.
- No bank-specific categories, so cross-bank comparison is fair.
- No judgement about whether the reviewer is right. These are unverified user reports.
