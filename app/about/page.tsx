export default function AboutPage() {
  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h1>About</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>SERVICE HOTLINE</div>
        <div>info@adtech-solutions.com</div>
        <div>+855 16 369 996</div>
        <div>Operating Hours: Mon – Sat (Half) from 8am to 5pm</div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>GET IN TOUCH</div>
        <div>N° 69, Street 103, Sangkhat Beong Trabek</div>
        <div>Khan Chamkarmorn, Phnom Penh, Cambodia</div>
      </div>
      <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        © {new Date().getFullYear()} ADTECH. All rights reserved. Developed by Seanghakk Neang.
      </p>
    </div>
  );
}