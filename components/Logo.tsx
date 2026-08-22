export default function Logo({ size = 22, showTagline = false }: { size?: number; showTagline?: boolean }) {
  return (
    <img
      src="/logo.png"
      alt="ADTECH — Your trusted solution partner"
      style={{ height: size * 1.6, width: "auto" }}
    />
  );
}