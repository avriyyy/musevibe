import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  experimental: {
    // The root AuthRouteGate intentionally replaces protected pages with a
    // gate screen until the browser session resolves, which implicit
    // validation reports as dropped segments. Validate only segments that
    // explicitly opt in with `instant`.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
};
export default nextConfig;
