import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fija la raíz al proyecto: la carpeta padre tiene otro package-lock.json y Next la inferiría como raíz.
  turbopack: { root: path.join(__dirname) },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
