export default function Footer() {
  return (
    <footer style={{ textAlign: "center", padding: "24px 16px", fontSize: 12, color: "var(--text-muted)" }}>
      © {new Date().getFullYear()} ADTECH. All rights reserved. Developed by Seanghakk Neang.
    </footer>
  );
}