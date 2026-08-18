# BUILD_MANIFEST.md — C1 UI remediation

| Artifact | Requirement | Planned location | Notes |
|----------|-------------|------------------|-------|
| ART-0010.1 | REQ-0010 | `src/lib/ui/control-styles.ts`; `src/components/ui/{Button,Input,Select}.tsx`; targeted pages | Shared 48px control geometry and icon-label contract. |
| ART-0011.1 | REQ-0011 | `src/components/Auth.tsx`; `src/app/globals.css` | Accessible entrance stagger with reduced-motion fallback. |
| ART-0012.1 | REQ-0012 | `src/components/collections/SmartCollections.tsx` | Accessible suggestions disclosure; preserve React Query behavior. |
| ART-0013.1 | REQ-0013 | `src/components/lists/{UrlList,UrlAddForm,UrlFilterBar,UrlBulkImportExport}.tsx`; `src/components/HomePage.tsx` | Toolbar, CTA, and responsive add-form refinement. |
| ART-0014.1 | REQ-0014 | Targeted source, hook, store, test, and utility files identified by lint | Type-safe lint remediation with no blanket suppressions. |
| ART-0015.1 | REQ-0015 | `src/components/layout/{Navbar,Footer}.tsx`; `src/types/browser-globals.d.ts` | Responsive 56px chrome alignment and one typed browser coordination contract. |
| ART-0016.1 | REQ-0016 | `src/components/Auth.tsx` | Opaque guest-account panel and parent stacking-context correction. |

Risk level: R2 (production UI and repository-wide behavior-sensitive lint remediation). No API, database, authorization, or session contract changes are authorized.
