# Security / Release Checklist

## Application

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] no secrets in repository
- [ ] production `RATE_LIMIT_SECRET` set
- [ ] production `QR_SIGNING_SECRET` set
- [ ] production `DATABASE_URL` stored in secret manager
- [ ] HTTPS enforced
- [ ] HSTS enabled only after HTTPS is confirmed
- [ ] CSP report-only reviewed before moving toward enforcement
- [ ] rate limits tested
- [ ] session expiry tested
- [ ] unauthorized media access tested
- [ ] answer-key projection tested

## Privacy

- [ ] approved privacy notice attached to the event
- [ ] PIA reviewed/approved
- [ ] DPS/DPO registration determination documented
- [ ] retention schedule approved
- [ ] media publication policy approved
- [ ] data-subject request procedure documented
- [ ] third-party processor agreements reviewed

## Operations

- [ ] backup completed
- [ ] restore drill completed
- [ ] RPO/RTO recorded
- [ ] incident contacts verified
- [ ] monitoring/alerts configured
- [ ] database migration rollback plan reviewed
- [ ] event-day marshal fallback procedure printed/offline

## Field test

- [ ] normal phone camera QR flow
- [ ] weak internet
- [ ] offline answer queue
- [ ] offline media queue
- [ ] reconnect replay
- [ ] projector leaderboard
- [ ] marshal device
- [ ] finalization and export
