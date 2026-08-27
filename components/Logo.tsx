export default function Logo({
  size = 22,
  showTagline = false,
  plate = false,
}: {
  size?: number;
  showTagline?: boolean;
  plate?: boolean;
}) {
  // logo.png is fully opaque with zero transparent pixels — NEVER apply a CSS
  // filter (e.g. brightness(0) invert(1)) to reverse it: that erases it into a
  // solid block. On dark surfaces (the rail, the field shell header, the tablet
  // bar) pass `plate` to sit the wordmark on a light ground instead.
  const img = (
    <img
      src="/logo.png"
      alt="ADTECH — Your trusted solution partner"
      style={{ height: size * 1.4, width: "auto", display: "block" }}
    />
  );
  if (!plate) return img;
  return (
    <span style={{ background: "#f3f2f2", padding: "6px 9px", display: "inline-block", lineHeight: 0 }}>
      {img}
    </span>
  );
}
