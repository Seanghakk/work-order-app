"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Logo from "./Logo";

export default function NavBar() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const [open, setOpen] = useState(false);

  const links = (
    <>
      <Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link>
      <Link href="/work-orders" onClick={() => setOpen(false)}>Work orders</Link>
      <Link href="/assets" onClick={() => setOpen(false)}>Assets</Link>
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/pm-schedules" onClick={() => setOpen(false)}>PM schedules</Link>}
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/reports" onClick={() => setOpen(false)}>Reports</Link>}
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/users" onClick={() => setOpen(false)}>Users</Link>}
    </>
  );

  return (
    <div className="nav">
            <div className="nav-top">
        <Logo size={20} />
        <button className="nav-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <div className={`nav-links ${open ? "nav-links-open" : ""}`}>
        <span className="nav-logo-inline"><Logo size={18} /></span>
        {links}
        <div className="nav-user">
          {session?.user?.name} ({role})
          <button onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
        </div>
      </div>
    </div>
  );
}