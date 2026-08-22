export default function Logo({ size = 22, showTagline = false }: { size?: number; showTagline?: boolean }) {
  return (
    <div style={{ background: "white", borderRadius: 8, padding: "4px 10px", display: "inline-flex", alignItems: "center" }}>
      <img
        src="/logo.png"
        alt="ADTECH — Your trusted solution partner"
        style={{ height: size * 1.4, width: "auto", display: "block" }}
      />
    </div>
  );
}