/** @type {import('next').NextConfig} */
const nextConfig = {
  // Send the home page (/) to the dashboard; proxy.js sends logged-out users on to /login
  async redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;