# STATE.md

**C1** | 2026-08-14

## Done
- Auth UX · gutter · avatar · prod `devLog`
- Clean Vercel logs: Sentry sourcemap upload opt-in (`SENTRY_UPLOAD_SOURCEMAPS`); `telemetry:false`; no `disableLogger`
- `prisma.config.ts` seed (removed package.json#prisma)

## Human
- HA-0001 Firewall
- Align `SENTRY_ORG`/`SENTRY_PROJECT` with auth token org before `SENTRY_UPLOAD_SOURCEMAPS=1`

## Next
```text
Load .agile-v/STATE.md. Clean deploy logs done. HA-0001 + Sentry org/token match if uploading maps. No densify/Zod/Next16/Prisma7 unless REQ.
```
