import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages use Node.js built-ins (fs, Buffer, streams, workers).
  // Mark them as external so Next.js/Turbopack doesn't try to bundle them
  // for the edge runtime — they must run in the Node.js serverless runtime.
  serverExternalPackages: [
    "pdfkit",
    "pdf-parse",
    "unpdf",
    "fontkit",
  ],
};

export default nextConfig;
