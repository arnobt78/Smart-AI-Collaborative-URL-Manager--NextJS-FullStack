# BUILD_MANIFEST.md — C2 homepage hero polish

| Artifact | Requirement | Planned location | Notes |
|----------|-------------|------------------|-------|
| ART-0010.1 | REQ-0010 | `src/lib/ui/control-styles.ts`; `src/components/ui/{Button,Input,Select}.tsx`; targeted pages | Shared 48px control geometry and icon-label contract. |
| ART-0011.1 | REQ-0011 | `src/components/Auth.tsx`; `src/app/globals.css` | Accessible entrance stagger with reduced-motion fallback. |
| ART-0012.1 | REQ-0012 | `src/components/collections/SmartCollections.tsx` | Accessible suggestions disclosure; preserve React Query behavior. |
| ART-0013.1 | REQ-0013 | `src/components/lists/{UrlList,UrlAddForm,UrlFilterBar,UrlBulkImportExport}.tsx`; `src/components/HomePage.tsx` | Toolbar, CTA, and responsive add-form refinement. |
| ART-0014.1 | REQ-0014 | Targeted source, hook, store, test, and utility files identified by lint | Type-safe lint remediation with no blanket suppressions. |
| ART-0015.1 | REQ-0015 | `src/components/layout/{Navbar,Footer}.tsx`; `src/types/browser-globals.d.ts` | Responsive 56px chrome alignment and one typed browser coordination contract. |
| ART-0016.1 | REQ-0016 | `src/components/Auth.tsx` | Opaque guest-account panel and parent stacking-context correction. |
| ART-0017.1 | REQ-0017 | `src/lib/ui/{control-styles,glass-button-styles}.ts`; `src/components/{ui/Button,ui/ScrollReveal,HomePage}.tsx`; `src/app/globals.css` | Shared compact geometry and dependency-free marketing reveal/parallax. |
| ART-0019.1 | REQ-0019 | `src/lib/ui-spacing.ts`; shared UI headers; targeted heading pairs | Central zero-gap title/subtitle contract with no data, auth, or control changes. |
| ART-0020.1 | REQ-0020 | requested data pages, unified list/comments, metadata route, Dialog, bulk import | Stable cached data surfaces, batched comment counts, no hard reload, and public-network metadata bounds. |
| ART-0022.1 | REQ-0022 | `src/lib/list-route-access.ts`; list, metadata, and vector route handlers; focused route tests | Canonical list resolution with cookie-session and collaborator-role authorization before list mutations or private side effects. |
| ART-0023.1 | REQ-0023 | URL mutation store/hooks, query invalidation utilities, Browse/Lists/Insights/detail data surfaces, focused tests | One optimistic URL mutation transaction with complete rollback and stable cached/static page surfaces. |
| ART-0023.2 | REQ-0023 | `src/lib/query-keys.ts`; `src/hooks/useListQueries.ts`; `src/utils/queryInvalidation.ts` | Hook-independent query-key contract prevents store/invalidation import cycles while preserving existing key values. |
| ART-0024.1 | REQ-0024 | `src/components/HomePage.tsx`; `src/components/__tests__/HomePage.test.tsx`; `jest.setup.js` | Reuse existing login mount-stagger classes for five hero rows; preserve lower scroll reveals and remove test debug output. |
| ART-0026.1 | REQ-0026 | `src/stores/urlListStore.ts`; `src/utils/queryInvalidation.ts`; collection/list URL components; focused tests | Store-owned optimistic rollback, typed scoped impacts including analytics, isolated vector indexing, and single-response collection refresh. |
| ART-0027.1 | REQ-0027 | `src/lib/{auth,server-data,server-query}.ts`; core pages; query utilities; focused tests | Persisted session verification, shared server data loaders, dehydrated core-page query keys, and complete mutation-impact reconciliation. |
| ART-0028.1 | REQ-0028 | `src/lib/{page-auth,server-data}.ts`; requested server pages; List/Activity/Insights UI; store/query utilities; focused tests | Protected SSR page guards, request hydration, stable data slots, synchronous summary-cache commits, and compact responsive disclosures/cards. |
| ART-0030.1 | REQ-0030 | `src/hooks/useListDialogRouteState.ts`; Lists/create/edit pages; shared CTA/confirmation dialog; focused tests | Native-history local list dialogs and parent-owned confirmed create/edit/delete pending lifecycle. |
| ART-0031.1 | REQ-0031 | `src/components/ui/Dialog.tsx`; dialog tests | One divider-free compact header contract for every active dialog; unused duplicate input overlay removed. |

Risk level: R2 (production UI and repository-wide behavior-sensitive lint remediation). No API, database, authorization, or session contract changes are authorized.
