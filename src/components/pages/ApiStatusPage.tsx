"use client";

import { useApiStatusQuery } from "@/hooks/useBrowseQueries";
import {
  ApiStatusChrome,
  ApiStatusRefreshControl,
} from "@/components/pages/ApiStatusChrome";

/**
 * C7.4–C7.6: Client owns status probe; chrome shared with loading.tsx shell.
 * Header refresh shows spinner + refreshing… while isFetching.
 */
export default function ApiStatusPage() {
  const { data: statusData, isFetching, refetch } = useApiStatusQuery();
  return (
    <ApiStatusChrome
      valuesPending={!statusData}
      data={statusData ?? null}
      headerAction={
        <ApiStatusRefreshControl
          isFetching={isFetching}
          onRefresh={() => {
            void refetch();
          }}
        />
      }
    />
  );
}
