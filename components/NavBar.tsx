"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function NavBar() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  return (
    <div className="nav">
      <strong>Work orders</strong>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/work-orders">Work orders</Link>
      <Link href="/assets">Assets</Link>
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/pm-schedules">PM schedules</Link>}
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/reports">Reports</Link>}
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/users">Users</Link>}
      <div style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)" }}>
        {session?.user?.name} ({role})
        <button style={{ marginLeft: 12 }} onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
      </div>
    </div>
  );
}
