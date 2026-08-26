"use client";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";

// How long a user can be idle before we warn them, and how long the warning
// stays up before we actually sign them out. Purely a client-side UX layer —
// doesn't touch NextAuth's session/JWT maxAge.
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_DURATION_MS = 60 * 1000; // 1 minute

const ACTIVITY_EVENTS = ["mousemove", "click", "keydown", "scroll", "touchstart"] as const;

// Don't reset the idle timer on every single mousemove — coalesce resets to
// at most once per second. Once the warning is up we skip the throttle so
// any activity dismisses it immediately.
const RESET_THROTTLE_MS = 1000;

export default function IdleTimeoutProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const authenticated = status === "authenticated";

  const [warning, setWarning] = useState(false);
  const warningRef = useRef(false);
  const lastResetRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    warningRef.current = warning;
  }, [warning]);

  const clearAllTimers = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(logoutTimerRef.current);
  }, []);

  const beginWarning = useCallback(() => {
    setWarning(true);
    logoutTimerRef.current = setTimeout(() => {
      signOut({ callbackUrl: "/login" });
    }, WARNING_DURATION_MS);
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearAllTimers();
    setWarning(false);
    idleTimerRef.current = setTimeout(beginWarning, IDLE_TIMEOUT_MS);
  }, [clearAllTimers, beginWarning]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    if (!warningRef.current && now - lastResetRef.current < RESET_THROTTLE_MS) return;
    lastResetRef.current = now;
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!authenticated) {
      clearAllTimers();
      setWarning(false);
      return;
    }
    resetIdleTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity, { passive: true, capture: true }));
    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity, { capture: true }));
    };
  }, [authenticated, handleActivity, resetIdleTimer, clearAllTimers]);

  if (!authenticated) return <>{children}</>;

  return (
    <>
      {children}
      {warning && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="idle-timeout-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16, 40, 60, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: 360, width: "90%", textAlign: "center" }}>
            <h3 id="idle-timeout-title" style={{ marginTop: 0 }}>Still there?</h3>
            <p style={{ color: "var(--text-muted)" }}>
              You'll be logged out in 1 minute due to inactivity.
            </p>
            <button className="primary" style={{ width: "100%" }} onClick={resetIdleTimer}>
              Stay logged in
            </button>
          </div>
        </div>
      )}
    </>
  );
}
