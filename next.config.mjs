import withPWA from "next-pwa";

const withPWAConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  // Service workers can make local development confusing (stale caches,
  // hard refreshes needed) — only enabled in production builds.
  disable: process.env.NODE_ENV === "development",
});

// On the control centre site (SITE_MODE=control-centre), the home page is
// the control centre.
const controlCentre = (process.env.SITE_MODE ?? "").trim().toLowerCase() === "control-centre";

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return controlCentre ? [{ source: "/", destination: "/control", permanent: false }] : [];
  },
};

export default withPWAConfig(nextConfig);
