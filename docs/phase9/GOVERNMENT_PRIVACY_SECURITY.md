# Government Privacy & Security Baseline

## Regulatory reading used for engineering

The repository is designed against the current NPC security framework rather than the superseded 2016 government-only circular.

### NPC Circular No. 2023-06

NPC Circular 2023-06 is the current security-of-personal-data circular covering government and private-sector processing and expressly repealed NPC Circular 16-01 effective 30 March 2024.

Engineering consequences for this project:

- privacy/security requirements are part of system design;
- a PIA record must exist for processing systems involving personal data;
- access must be controlled and authenticated;
- appropriate technical, organizational and physical safeguards must exist;
- business continuity must cover backup, restoration and remedial time;
- retention must have an approved purpose and schedule;
- third-party processing must be governed by the agency's privacy/security arrangements.

### NPC Advisory No. 2025-02

The 2025 privacy-engineering advisory reinforces incorporating privacy requirements through the system life cycle. This supports the repository rule that privacy controls are architecture and tests, not a launch checklist only.

### NPC Circular No. 2022-04

The NPC's current registration materials identify mandatory Data Processing System/DPO registration conditions, including government processing likely to pose risk to data subjects' rights and freedoms, as well as other thresholds. The agency/DPO must make the actual registration determination.

### Breach management

NPC Circular 16-03 and current NPC breach-reporting materials describe the 72-hour notification process when mandatory notification applies. This platform records incident discovery, containment, notification due date, affected-subject estimate and reporting evidence, but deliberately does not auto-classify legal reportability.

## Minimum agency decisions still required

Before production, the agency should document:

1. PIC/PIP roles;
2. DPO and security contact;
3. lawful processing basis for each processing purpose;
4. PIA approval;
5. DPS/DPO registration or applicable exemption determination;
6. privacy notice approval;
7. records-retention schedule;
8. media/publication policy;
9. backup/restore RPO/RTO;
10. incident/breach escalation tree;
11. vendor/cloud agreements and processor obligations;
12. staff security/privacy training;
13. production access approvals;
14. disaster-recovery test evidence.
