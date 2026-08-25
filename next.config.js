/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/work-orders/[id]/report": ["./node_modules/pdfkit/js/**/*"],
      "/api/work-orders/[id]": ["./node_modules/pdfkit/js/**/*"],
    },
  },
};
module.exports = nextConfig;