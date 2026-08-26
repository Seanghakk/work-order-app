"use client";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import SearchBar from "./SearchBar";
import { canAccessSaleOrders, canAccessWorkOrders, canAccessServiceRequests } from "@/lib/permissions";

export default function NavBar() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  function closeAllPanels() {
    setPanelOpen(false);
    setMaintenanceOpen(false);
    setSalesOpen(false);
    setProjectOpen(false);
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
    if (panelOpen || maintenanceOpen || salesOpen || projectOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [panelOpen, maintenanceOpen, salesOpen, projectOpen]);
  async function handleBellClick() {
    const next = !panelOpen;
    setMaintenanceOpen(false);
    setSalesOpen(false);
    setProjectOpen(false);
    setPanelOpen(next);
    if (next) loadNotifications();
  }
  function toggleMaintenance() {
    setPanelOpen(false);
    setSalesOpen(false);
    setProjectOpen(false);
    setMaintenanceOpen((v) => !v);
  }
  function toggleSales() {
    setPanelOpen(false);
    setMaintenanceOpen(false);
    setProjectOpen(false);
    setSalesOpen((v) => !v);
  }
  function toggleProject() {
    setPanelOpen(false);
    setMaintenanceOpen(false);
    setSalesOpen(false);
    setProjectOpen((v) => !v);
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
  async function clearAllNotifications() {
    if (!confirm("Clear all notifications?")) return;
    await fetch("/api/notifications", { method: "DELETE" });
    loadNotifications();
  }
  async function dismissNotification(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    loadNotifications();
  }
  const canSeeMaintenanceContracts = role === "MANAGER" || role === "ADMIN" || role === "SALES_LEADER" || role === "SALES_ENGINEER" || role === "MAINTENANCE_LEADER" || role === "MAINTENANCE_TECHNICIAN";
  const links = (
    <>
      <Link href="/dashboard" onClick={closeMenuAndPanels}>Dashboard</Link>
      {(canAccessWorkOrders(role) || canAccessServiceRequests(role)) && (
        <span className="nav-dropdown-wrap">
        <button className={`nav-dropdown-trigger ${maintenanceOpen ? "active" : ""}`} onClick={toggleMaintenance}>
          Maintenance <span className="chevron">▾</span>
        </button>
        {maintenanceOpen && (
          <div className="nav-dropdown-panel">
            {canAccessWorkOrders(role) && <Link href="/work-orders" onClick={closeMenuAndPanels}>Work Orders</Link>}
            {canAccessWorkOrders(role) && <Link href="/assets" onClick={closeMenuAndPanels}>Assets</Link>}
            {(role === "MANAGER" || role === "ADMIN") && (
              <Link href="/pm-schedules" onClick={closeMenuAndPanels}>PM Schedules</Link>
            )}
            {canAccessServiceRequests(role) && <Link href="/service-requests" onClick={closeMenuAndPanels}>Service Requests</Link>}
          </div>
        )}
      </span>
      )}
      {(canAccessSaleOrders(role) || canSeeMaintenanceContracts) && (
        <span className="nav-dropdown-wrap">
          <button className={`nav-dropdown-trigger ${salesOpen ? "active" : ""}`} onClick={toggleSales}>
            Sales <span className="chevron">▾</span>
          </button>
          {salesOpen && (
            <div className="nav-dropdown-panel">
              {canAccessSaleOrders(role) && <Link href="/sale-orders" onClick={closeMenuAndPanels}>Sale Orders</Link>}
              {canSeeMaintenanceContracts && (
                <Link href="/maintenance-contracts" onClick={closeMenuAndPanels}>Maintenance Contracts</Link>
              )}
            </div>
          )}
        </span>
      )}
      {role !== "REQUESTER" && (
        <span className="nav-dropdown-wrap">
          <button className={`nav-dropdown-trigger ${projectOpen ? "active" : ""}`} onClick={toggleProject}>
            Project <span className="chevron">▾</span>
          </button>
          {projectOpen && (
            <div className="nav-dropdown-panel">
              <Link href="/defect-reports" onClick={closeMenuAndPanels}>Defect Reports</Link>
              <Link href="/material-requisitions" onClick={closeMenuAndPanels}>Material Requisitions</Link>
            </div>
          )}
        </span>
      )}
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/reports" onClick={closeMenuAndPanels}>Reports</Link>}
      {(role === "MANAGER" || role === "ADMIN") && <Link href="/users" onClick={closeMenuAndPanels}>Users</Link>}
      {role === "ADMIN" || role === "MANAGER" ? <Link href="/sites" onClick={closeMenuAndPanels}>Sites</Link> : null}
      {role === "ADMIN" || role === "MANAGER" ? <Link href="/teams" onClick={closeMenuAndPanels}>Teams</Link> : null}
      <Link href="/about" onClick={closeMenuAndPanels}>About</Link>
    </>
  );
  return (
    <div className="nav" ref={navRef}>
      <div className="nav-top">
        <Logo size={20} />
        <button className="nav-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? "Close" : "Menu"}
        </button>
      </div>
      <div className={`nav-links ${open ? "nav-links-open" : ""}`}>
        <span className="nav-logo-inline"><Logo size={18} /></span>
        <div className="nav-desktop-links">{links}</div>
        <div className="nav-mobile-links">
          <Link href="/dashboard" onClick={closeMenuAndPanels}>Dashboard</Link>
          {canAccessWorkOrders(role) && <Link href="/work-orders" onClick={closeMenuAndPanels}>Work Orders</Link>}
          {canAccessSaleOrders(role) && <Link href="/sale-orders" onClick={closeMenuAndPanels}>Sale Orders</Link>}
          {canAccessServiceRequests(role) && <Link href="/service-requests" onClick={closeMenuAndPanels}>Service Requests</Link>}
          <p className="nav-mobile-note">For full features, open on a desktop browser.</p>
        </div>
        <SearchBar />
        <div className="nav-user">
          <span style={{ position: "relative" }}>
            <button className="notif-bell" onClick={handleBellClick} aria-label="Notifications">
              {"\u{1F514}"}
              {unreadCount > 0 && <span className="notif-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
            {panelOpen && (
              <div className="notif-panel">
                {notifications.length > 0 && (
                  <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
                    <button className="notif-item" onClick={markAllRead} style={{ color: "var(--blue)", textAlign: "center", border: "none" }}>
                      Mark all as read
                    </button>
                    <button className="notif-item" onClick={clearAllNotifications} style={{ color: "var(--danger)", textAlign: "center", border: "none" }}>
                      Clear all
                    </button>
                  </div>
                )}
                {notifications.length === 0 && <div className="notif-empty">No notifications yet.</div>}
                {notifications.map((n) => (
                  <div key={n.id} className={`notif-item ${!n.readAt ? "unread" : ""}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }} onClick={() => handleNotificationClick(n)}>
                    <div style={{ flex: 1 }}>
                      <div>{n.message}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button onClick={(e) => dismissNotification(n.id, e)} aria-label="Dismiss" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>{"\u00D7"}</button>
                  </div>
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
