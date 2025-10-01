import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Using static export for simple hosting; API is external
  output: "export",
  // Ensure runtime variables are read on client; user must define NEXT_PUBLIC_BACKEND_URL
};

export default nextConfig;
