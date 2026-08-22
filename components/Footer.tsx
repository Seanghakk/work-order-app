export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", marginTop: 40, padding: "28px 16px", fontSize: 13, color: "var(--text-muted)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>SERVICE HOTLINE</div>
          <div>info@adtech-solutions.com</div>
          <div>+855 16 369 996</div>
          <div>Operating Hours: Mon – Sat (Half) from 8am to 5pm</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>GET IN TOUCH</div>
          <div>N° 69, Street 103, Sangkhat Beong Trabek</div>
          <div>Khan Chamkarmorn, Phnom Penh, Cambodia</div>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        © {new Date().getFullYear()} ADTECH. All rights reserved. Developed by Seanghakk Neang.
      </div>
    </footer>
  );
}