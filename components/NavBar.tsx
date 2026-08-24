"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { canAccessSaleOrders, canAccessWorkOrders, canAccessServiceRequests } from "@/lib/permissions";

export default function NavBar() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [workOpen, setWorkOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  function closeAllPanels() {
    setPanelOpen(false);
    setWorkOpen(false);
    setSaleOpen(false);
  }

  function closeMenuAndPanels() {
    setOpen(false);
    closeAllPanels();
  }

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        closeAllPanels();
      }
    }
    if (panelOpen || workOpen || saleOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen, workOpen, saleOpen]);

  async function handleBellClick() {
    const next = !panelOpen;
    setWorkOpen(false);
    setSaleOpen(false);
    setPanelOpen(next);
    if (next) loadNotifications();
  }

  function toggleWork() {
    setPanelOpen(false);
    setSaleOpen(false);
    setWorkOpen((v) => !v);
  }

  function toggleSale() {
    setPanelOpen(false);
    setWorkOpen(false);
    setSaleOpen((v) => !v);
  }

  async function handleNotificationClick(n: any) {
    if (!n.readAt) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
    }
    setPanelOpen(false);
    if (n.link) router.push(n.link);
    loadNotifications();
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    loadNotifications();
  }

  const links = (
    <>
      <Link href="/dashboard" onClick={closeMenuAndPanels}>Dashboard</Link>

      {canAccessWorkOrders(role) && (
	<span className="nav-dropdown-wrap">
        <button className={`nav-dropdown-trigger ${workOpen ? "active" : ""}`} onClick={toggleWork}>
          Work Orders ▾
        </button>
        {workOpen && (
          <div className="nav-dropdown-panel">
            <Link href="/work-orders" onClick={closeMenuAndPanels}>Work Orders</Link>
            <Link href="/assets" onClick={closeMenuAndPanels}>Assets</Link>
            {(role === "MANAGER" || role === "ADMIN") && (
              <Link href="/pm-schedules" onClick={closeMenuAndPanels}>PM Schedules</Link>
            )}
          </div>
        )}
      </span>
      )}

      {(canAccessSaleOrders(role) || canAccessServiceRequests(role)) && (
        <span className="nav-dropdown-wrap">
          <button className={`nav-dropdown-trigger ${saleOpen ? "active" : ""}`} onClick={toggleSale}>
            Sale Orders ▾
          </button>
          {saleOpen && (
            <div className="nav-dropdown-panel">
              {canAccessSaleOrders(role) && <Link href="/sale-orders" onClick={closeMenuAndPanels}>Sale Orders</Link>}
              {canAccessServiceRequests(role) && <Link href="/service-requests" onClick={closeMenuAndPanels}>Service Requests</Link>}
            </div>
          )}
        </span>
      )}

      {(role === "MANAGER" || role === "ADMIN") && <Link href="/reports" onClick={closeMenuAndPanels}>Reports</Link>}
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/users" onClick={closeMenuAndPanels}>Users</Link>}
      {role === "ADMIN" || role === "MANAGER" ? <Link href="/sites" onClick={closeMenuAndPanels}>Sites</Link> : null}
      <Link href="/about" onClick={closeMenuAndPanels}>About</Link>
    </>
  );

  return (
    <div className="nav" style={{ position: "relative" }} ref={navRef}>
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
          <span style={{ position: "relative" }}>
            <button className="notif-bell" onClick={handleBellClick} aria-label="Notifications">
              🔔
              {unreadCount > 0 && <span className="notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
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
          </span>
          <Link href="/account" onClick={closeMenuAndPanels}>{session?.user?.name} ({role})</Link>
          <button onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</button>
        </div>
      </div>
    </div>
  );
}