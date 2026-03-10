import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit and pdf-parse use Node.js built-ins (fs, Buffer, streams).
  // Mark them as external so Next.js/Turbopack doesn't try to bundle them
  // for the edge runtime — they must run in the Node.js serverless runtime.
  serverExternalPackages: [
    "pdfkit",
    "pdf-parse",
    "fontkit",
  ],
};

export default nextConfig;
