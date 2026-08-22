export default function Logo({ size = 22, showTagline = false }: { size?: number; showTagline?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L22 20H2L12 2Z" fill="var(--accent)" />
        <path d="M12 8L17 17H7L12 8Z" fill="var(--bg)" />
      </svg>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontWeight: 700, fontSize: size * 0.8, letterSpacing: 0.5, color: "var(--text)" }}>ADTECH</div>
        {showTagline && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Your trusted solution partner</div>}
      </div>
    </div>
  );
}