import { ApiStatusSoftNavLoading } from "@/components/ui/SoftNavLoading";

/**
 * C7.5: Soft-nav paints matching chrome immediately (not center spinner).
 * Auth RSC then swaps to ApiStatusPage; client fills live values.
 */
export default function ApiStatusLoading() {
  return <ApiStatusSoftNavLoading />;
}
