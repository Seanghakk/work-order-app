export { default } from "next-auth/middleware";

export const config = {
    matcher: ["/dashboard/:path*", "/work-orders/:path*", "/assets/:path*", "/pm-schedules/:path*", "/reports/:path*", "/users/:path*"],
};
