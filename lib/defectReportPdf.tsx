import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const NAVY = "#0e5c86";
const TEXT_MUTED = "#5b6b7a";
const BORDER = "#e1e5ea";
const APP_URL = process.env.NEXTAUTH_URL || "";

const DISCIPLINE_LABEL: Record<string, string> = {
  LIGHTING: "Lighting System", AUTOMATION: "Automation", FIRE_ALARM: "Fire Alarm System",
  PA_SYSTEM: "Public Address System", BMS: "Building Management System",
  ACCESS_CONTROL_INTRUSION: "Access Control System & Intrusion", CAR_PARKING: "Car Parking System",
  CCTV: "CCTV System", DATA_TEL_TV: "Data, Tel & TV System", OTHER: "Others",
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1c2b39" },
  companyHeader: { alignItems: "center", marginBottom: 10, borderBottom: `2 solid ${NAVY}`, paddingBottom: 8 },
  logoImage: { width: 150, height: 38, objectFit: "contain" },
  reportBanner: { backgroundColor: NAVY, color: "white", textAlign: "center", paddingVertical: 5, marginBottom: 10, fontSize: 11, fontFamily: "Helvetica-Bold" },
  metaRow: { flexDirection: "row", marginBottom: 10 },
  metaCol: { flex: 1 },
  metaLine: { flexDirection: "row", marginBottom: 3 },
  metaLabel: { fontSize: 8, color: TEXT_MUTED, width: 100 },
  metaValue: { fontSize: 9, flex: 1 },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1 solid ${BORDER}`, paddingBottom: 2 },
  bodyText: { fontSize: 9, lineHeight: 1.5 },
  table: { border: `1 solid ${BORDER}` },
  tRow: { flexDirection: "row", borderBottom: `1 solid ${BORDER}` },
  tHeadRow: { flexDirection: "row", backgroundColor: "#f4f6f8", borderBottom: `1 solid ${BORDER}` },
  tCellH: { fontSize: 7, fontFamily: "Helvetica-Bold", padding: 4, color: NAVY },
  tCell: { fontSize: 7, padding: 4 },
  cItem: { width: "5%" }, cPart: { width: "12%" }, cDesc: { width: "18%" }, cBrand: { width: "10%" },
  cUnit: { width: "8%" }, cQty: { width: "7%" }, cDefect: { width: "25%" }, cPhoto: { width: "15%" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoBox: { width: 140, marginBottom: 10 },
  photo: { width: 140, height: 100, objectFit: "cover", borderRadius: 3, border: `1 solid ${BORDER}` },
  photoCaption: { fontSize: 7, color: TEXT_MUTED, marginTop: 3 },
  signRow: { flexDirection: "row", marginTop: 16, borderTop: `1 solid ${BORDER}`, paddingTop: 10 },
  signCol: { flex: 1, paddingRight: 8 },
  signRoleTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  signatureArea: { height: 44, borderBottom: `1 solid ${BORDER}`, marginBottom: 6 },
  signLine: { fontSize: 8, color: TEXT_MUTED, marginBottom: 8 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 6, color: TEXT_MUTED, textAlign: "center", borderTop: `1 solid ${BORDER}`, paddingTop: 5 },
});

function SignatureBlock({ role }: { role: string }) {
  return (
    <View style={styles.signCol}>
      <Text style={styles.signRoleTitle}>{role}</Text>
      <View style={styles.signatureArea} />
      <Text style={styles.signLine}>Name: ____________</Text>
      <Text style={styles.signLine}>Position: ____________</Text>
      <Text style={styles.signLine}>Date: ____________</Text>
    </View>
  );
}

export function DefectReportDocument({ report }: { report: any }) {
  const disciplineLabel = report.discipline
    ? (report.discipline === "OTHER" ? `Other: ${report.otherDisciplineText || ""}` : DISCIPLINE_LABEL[report.discipline] || report.discipline)
    : "—";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.companyHeader}>
          <Image src={`${APP_URL}/logo.png`} style={styles.logoImage} />
        </View>
        <Text style={styles.reportBanner}>DEFECT REPORT</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>DF No.</Text><Text style={styles.metaValue}>{report.dfNumber || report.id.slice(-8).toUpperCase()}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Project</Text><Text style={styles.metaValue}>{report.projectName}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Main Contractor</Text><Text style={styles.metaValue}>{report.mainContractor || "—"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Sub Contractor</Text><Text style={styles.metaValue}>{report.subContractor}</Text></View>
          </View>
          <View style={styles.metaCol}>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Date</Text><Text style={styles.metaValue}>{new Date(report.date).toLocaleDateString()}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Section</Text><Text style={styles.metaValue}>{report.section || "—"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Discipline</Text><Text style={styles.metaValue}>{disciplineLabel}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Site</Text><Text style={styles.metaValue}>{report.site?.name || "—"}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            <View style={styles.tHeadRow}>
              <Text style={[styles.tCellH, styles.cItem]}>Item</Text>
              <Text style={[styles.tCellH, styles.cPart]}>Part Number</Text>
              <Text style={[styles.tCellH, styles.cDesc]}>Description</Text>
              <Text style={[styles.tCellH, styles.cBrand]}>Brand</Text>
              <Text style={[styles.tCellH, styles.cUnit]}>Unit</Text>
              <Text style={[styles.tCellH, styles.cQty]}>Qty</Text>
              <Text style={[styles.tCellH, styles.cDefect]}>Defect Description</Text>
              <Text style={[styles.tCellH, styles.cPhoto]}>Photo Reference</Text>
            </View>
            {report.items.map((it: any) => (
              <View key={it.id} style={styles.tRow}>
                <Text style={[styles.tCell, styles.cItem]}>{it.itemNo}</Text>
                <Text style={[styles.tCell, styles.cPart]}>{it.partNumber || ""}</Text>
                <Text style={[styles.tCell, styles.cDesc]}>{it.description || ""}</Text>
                <Text style={[styles.tCell, styles.cBrand]}>{it.brand || ""}</Text>
                <Text style={[styles.tCell, styles.cUnit]}>{it.unit || ""}</Text>
                <Text style={[styles.tCell, styles.cQty]}>{it.qty ?? ""}</Text>
                <Text style={[styles.tCell, styles.cDefect]}>{it.defectDescription || ""}</Text>
                <Text style={[styles.tCell, styles.cPhoto]}>{it.photoReference || ""}</Text>
              </View>
            ))}
          </View>
        </View>

        {report.remark && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Remark</Text>
            <Text style={styles.bodyText}>{report.remark}</Text>
          </View>
        )}

        {report.allPhotos && report.allPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({report.allPhotos.length})</Text>
            <View style={styles.photoGrid}>
              {report.allPhotos.map((p: any) => (
                <View key={p.id} style={styles.photoBox}>
                  {p.dataUri && <Image src={p.dataUri} style={styles.photo} />}
                  <Text style={styles.photoCaption}>{p.caption}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={styles.signRow}>
          <SignatureBlock role="Prepared By" />
          <SignatureBlock role="Checked By" />
          <SignatureBlock role="Checked By" />
          <SignatureBlock role="Approved By" />
        </View>

        <Text style={styles.footer} fixed>
          ADTECH Co., LTD · No.69, Street 103, Phum 8, Sangkat Beong Trabek, Khan Chamkarnom, Phnom Penh, Cambodia · Hotline +855 99 415 189
        </Text>
      </Page>
    </Document>
  );
}

async function toDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    // Normalize every photo to PNG — pdfkit (the engine behind @react-pdf/renderer)
    // only supports JPEG and PNG natively, and phone photos are often WebP/HEIC.
    const sharp = (await import("sharp")).default;
    const pngBuffer = await sharp(Buffer.from(arrayBuffer)).png().toBuffer();
    const base64 = pngBuffer.toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error("Failed to fetch/convert photo for PDF:", err);
    return null;
  }
}

export async function generateDefectReportPdf(report: any): Promise<Buffer> {
  const itemPhotos = (report.items || []).flatMap((it: any) =>
    (it.photos || []).map((p: any) => ({ ...p, caption: `Item ${it.itemNo}` }))
  );
  const generalPhotos = (report.photos || []).map((p: any) => ({ ...p, caption: "General" }));
  const rawPhotos = [...itemPhotos, ...generalPhotos];
  const allPhotos = await Promise.all(
    rawPhotos.map(async (p: any) => ({ ...p, dataUri: await toDataUri(p.url) }))
  );
  const reportWithPhotos = { ...report, allPhotos };
  return renderToBuffer(<DefectReportDocument report={reportWithPhotos} />);
}