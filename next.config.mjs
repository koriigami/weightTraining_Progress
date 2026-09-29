/** @type {import('next').NextConfig} */
const nextConfig = {
  // The dev-mode indicator's portal can cover the viewport and intercept
  // pointer events (including for automated testing); it has no effect on
  // production builds.
  devIndicators: false,
  // The old Badges and Goals pages moved: Badges became Rank, and Goals now
  // lives on the Profile page.
  async redirects() {
    return [
      { source: '/badges', destination: '/rank', permanent: false },
      { source: '/goals', destination: '/profile#goals', permanent: false },
    ];
  },
};

export default nextConfig;
