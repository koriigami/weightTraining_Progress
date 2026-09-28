/** @type {import('next').NextConfig} */
const nextConfig = {
  // The dev-mode indicator's portal can cover the viewport and intercept
  // pointer events (including for automated testing); it has no effect on
  // production builds.
  devIndicators: false,
};

export default nextConfig;
