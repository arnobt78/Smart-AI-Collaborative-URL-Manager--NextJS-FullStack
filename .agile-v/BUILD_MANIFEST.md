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
| ART-0032.1 | REQ-0032 | `src/components/lists/CreateListDialog.tsx`; `HomePage.tsx`; `ListsPage.tsx`; focused tests | One local create-dialog lifecycle for hydrated Home and Lists CTAs; native history only, no RSC overlay navigation. |
| ART-0033.1 | REQ-0033 | `src/hooks/useListDialogRouteState.ts`; `ListPage.tsx`; focused tests | Hydrated create/edit use history.state on the same href; search params are mount-only deep links. |
| ART-0034.1 | REQ-0034 | `src/components/ui/CreateNewListButton.tsx`; Home tests | Shared launcher requires local onClick; no `/lists?dialog=create` href fallback. |
| ART-0035.1 | REQ-0035 | URL/comment/collaborator/Smart Collections overlays; Dialog tests | Mutating overlays stay pending until network result plus committed paint. |
| ART-0036.1 | REQ-0036 | `RoutePageSkeleton`; lists/browse/insights/detail `loading.tsx` + auth-only pages; delayed cold slots; `lib/auth.ts` requestCache | Instant soft-nav destination shells; client RQ fills data after auth-gated RSC. |
| ART-0037.1 | REQ-0037 | lists/browse/insights/detail `page.tsx` prefetch + dehydrate | SSR hydrate under loading.tsx; one continuous soft-nav skeleton. |
| ART-0038.1 | REQ-0038 | `soft-nav-cache`; WarmSoftNavLink; SoftNavLoading; Insights overview SSR; auth session.user | Warm soft-nav skip skeleton; lighter Insights RSC. |
| ART-0039.1 | REQ-0039 | `OptimisticSoftNavSurface`; SoftNavLoading never null; Lists/Browse/Insights/List empty-flash fixes; warm replace | Warm paints RQ destination UI; cold one skeleton. |
| ART-0040.1 | REQ-0040 | Shared Lists/Browse/Insights chrome; OptimisticSoftNavSurface parity; Browse filter; Insights tabs/CARD_PAD; no page min-h-screen | Instant static chrome; no late catch-up on warm soft-nav. |
| ART-0041.1 | REQ-0041 | `queryInvalidation.ts` densify helpers; `useListQueries` list CRUD wiring; densify unit tests | Targeted browse densify + insights invalidate; no full densify rewrite. |
| ART-0042.1 | REQ-0042 | Footer/ProfileDropdown prefetch; `business-insights-lists.ts`; overview/activity routes; globals.css | Rare _rsc off; one Insights list scan; dark scrollbar. |
| ART-0043.1 | REQ-0043 | api-docs/status loading + skeletons; CARD_PAD; slim status; optimistic ProfileDropdown logout | Soft-nav shells; faster status; instant logout to `/`. |
| ART-0044.1 | REQ-0044 | api-status auth-only page; ApiStatusPage inline value pulses | Chrome-first; no full-page loading.tsx (superseded by ART-0045.1). |
| ART-0045.1 | REQ-0045 | ApiStatusChrome; api-status/loading.tsx; SoftNavLoading chrome | Soft-nav leaves previous page with matching chrome+pulses. |

Risk level: R2 (production UI and repository-wide behavior-sensitive lint remediation). No API, database, authorization, or session contract changes are authorized.
