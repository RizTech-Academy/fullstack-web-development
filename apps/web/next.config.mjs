/** @type {import("next").NextConfig} */
const nextConfig = {
  // The shared package ships TypeScript sources as well as a build. Next
  // compiles it itself so a change there is picked up without rebuilding.
  transpilePackages: ["@kirana/shared"],
  images: {
    // Product images come from the seed data as remote URLs. Anything not
    // listed here is refused outright rather than proxied — see the module 11
    // lesson on images.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
