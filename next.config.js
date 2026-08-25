/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/work-orders/[id]/report": ["./node_modules/pdfkit/js/**/*"],
      "/api/work-orders/[id]": ["./node_modules/pdfkit/js/**/*"],
      "/api/work-orders/[id]/send": ["./node_modules/pdfkit/js/**/*"],
      "/api/defect-reports/[id]/report": ["./node_modules/pdfkit/js/**/*"],
      "/api/defect-reports/[id]/send": ["./node_modules/pdfkit/js/**/*"],
      "/api/material-requisitions/[id]/report": ["./node_modules/pdfkit/js/**/*"],
      "/api/material-requisitions/[id]/send": ["./node_modules/pdfkit/js/**/*"],
    },
  },
};
module.exports = nextConfig;