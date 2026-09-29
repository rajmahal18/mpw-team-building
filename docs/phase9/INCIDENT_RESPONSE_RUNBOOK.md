# Incident Response Runbook

## Severity is not reportability

Severity is an operational classification. Whether a personal-data breach is legally reportable must be assessed by the agency's authorized privacy/security personnel.

## Initial response

1. Record a `SecurityIncident` immediately.
2. Capture discovery time, reporter, affected system/event and initial scope.
3. Contain the account/session/credential or endpoint involved.
4. Preserve relevant audit/domain/security evidence.
5. Do not delete logs while investigating.
6. Assess what personal data may be involved.
7. Assess whether unauthorized access/disclosure occurred.
8. Assess likely risk to data subjects.
9. Escalate to the DPO/security lead/agency head according to the agency plan.
10. Determine whether NPC/data-subject notification requirements apply.

## 72-hour clock

Where mandatory notification applies, use the agency's documented breach process and the NPC's current DBNMS procedure. The application stores `notificationDueAt` and `reportedToNpcAt` as operational evidence; it does not automatically declare the incident reportable.

## Recovery

- rotate affected credentials;
- invalidate compromised sessions;
- revoke checkpoint credentials where relevant;
- restore from a known-good backup when integrity is uncertain;
- verify event/score ledger consistency;
- document corrective actions;
- close only after the incident owner confirms recovery and follow-up.

## Never do

- paste passwords or raw tokens into the incident description;
- upload raw sensitive data as “evidence” without an approved repository;
- overwrite the original audit trail;
- silently alter final scores to hide an incident;
- tell participants that an incident is harmless before the assessment is complete.
