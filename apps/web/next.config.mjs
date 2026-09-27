/** @type {import("next").NextConfig} */
const nextConfig = {
  // The shared package ships TypeScript sources as well as a build. Next
  // compiles it itself so a change there is picked up without rebuilding.
  transpilePackages: ["@kirana/shared"],

  // Deliberately no `images.remotePatterns`. Every product picture is a file in
  // public/products/, committed to this repository, so there is no remote host
  // to allow. That is the point: an image loaded from somebody else's server
  // can rot, rate-limit, or change under you, and the shop looks broken with
  // nothing in the code to explain why.
  //
  // When the shop starts uploading real photographs they will go to storage you
  // control, and that host — one host, named — goes here.
};

export default nextConfig;
