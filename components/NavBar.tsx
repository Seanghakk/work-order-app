"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function NavBar() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  function loadNotifications() {
    fetch("/api/notifications").then((r) => r.json()).then((data) => {
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    });
  }

  useEffect(() => {
    if (session) loadNotifications();
  }, [session]);

  async function handleBellClick() {
    const next = !panelOpen;
    setPanelOpen(next);
    if (next) loadNotifications();
  }

  async function handleNotificationClick(n: any) {
    if (!n.readAt) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
    }
    setPanelOpen(false);
    if (n.workOrderId) router.push(`/work-orders/${n.workOrderId}`);
    loadNotifications();
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    loadNotifications();
  }

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
    <div className="nav" style={{ position: "relative" }}>
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
          <button className="notif-bell" onClick={handleBellClick} aria-label="Notifications">
            🔔
            {unreadCount > 0 && <span className="notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </button>
          {session?.user?.name} ({role})
          <button onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
        </div>
      </div>
      {panelOpen && (
        <div className="notif-panel">
          {notifications.length > 0 && (
            <button className="notif-item" onClick={markAllRead} style={{ color: "var(--blue)", textAlign: "center" }}>
              Mark all as read
            </button>
          )}
          {notifications.length === 0 && <div className="notif-empty">No notifications yet.</div>}
          {notifications.map((n) => (
            <button key={n.id} className={`notif-item ${!n.readAt ? "unread" : ""}`} onClick={() => handleNotificationClick(n)}>
              <div>{n.message}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                {new Date(n.createdAt).toLocaleString()}
              </div>
            </button>
          ))}
        </div>
      )}