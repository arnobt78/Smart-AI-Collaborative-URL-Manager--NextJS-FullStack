"use client";

import { useApiStatusQuery } from "@/hooks/useBrowseQueries";
import { ApiStatusChrome } from "@/components/pages/ApiStatusChrome";

/**
 * C7.4/C7.5: Client owns status probe; chrome shared with loading.tsx shell.
 */
export default function ApiStatusPage() {
  const { data: statusData } = useApiStatusQuery();
  return (
    <ApiStatusChrome
      valuesPending={!statusData}
      data={statusData ?? null}
    />
  );
}
