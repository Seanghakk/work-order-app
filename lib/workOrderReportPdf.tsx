import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const NAVY = "#0e5c86";
const NAVY_DEEP = "#0a3f5c";
const RED = "#c62430";
const TEXT_MUTED = "#5b6b7a";
const BORDER = "#e1e5ea";
const APP_URL = process.env.NEXTAUTH_URL || "";

const SERVICE_TYPE_LABEL: Record<string, string> = {
  REPAIR: "Repair", TROUBLESHOOTING: "Troubleshooting (minor repair)", WARRANTY: "Warranty",
  EMERGENCY_OT: "Emergency on duty (OT)", MAINTENANCE: "Maintenance", INSTALLATION: "Installation", OTHER: "Other",
};
const DISCIPLINE_LABEL: Record<string, string> = {
  FAS: "FAS (Fire Alarm)", BMS: "BMS", FSS: "FSS (Fire Suppression)", ACS: "ACS (Access Control)",
  CCTV: "CCTV", PA: "PA (Public Address)", OTHER: "Other",
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1c2b39" },
  companyHeader: { alignItems: "center", marginBottom: 10, borderBottom: `2 solid ${NAVY}`, paddingBottom: 8 },
  logoImage: { width: 150, height: 38, objectFit: "contain", marginBottom: 4 },
  companyLine: { fontSize: 7, color: TEXT_MUTED, marginTop: 2, textAlign: "center" },
  reportBanner: { backgroundColor: NAVY, color: "white", textAlign: "center", paddingVertical: 5, marginBottom: 10, fontSize: 11, fontFamily: "Helvetica-Bold" },
  metaRow: { flexDirection: "row", marginBottom: 10 },
  metaCol: { flex: 1 },
  metaLine: { flexDirection: "row", marginBottom: 3 },
  metaLabel: { fontSize: 8, color: TEXT_MUTED, width: 90 },
  metaValue: { fontSize: 9, flex: 1 },
  badgeRow: { flexDirection: "row", gap: 6, marginBottom: 10 },
  badge: { fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3, color: "white" },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1 solid ${BORDER}`, paddingBottom: 2 },
  bodyText: { fontSize: 9, lineHeight: 1.5 },
  warrantyBox: { backgroundColor: "#fdeceb", border: `1 solid ${RED}`, borderRadius: 4, padding: 6, marginBottom: 10 },
  warrantyText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: RED },
  fixedRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  fixedLabel: { fontSize: 9, fontFamily: "Helvetica-Bold" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoBox: { width: 140, marginBottom: 10 },
  photo: { width: 140, height: 100, objectFit: "cover", borderRadius: 3, border: `1 solid ${BORDER}` },
  photoCaption: { fontSize: 7, color: TEXT_MUTED, marginTop: 3 },
  commentBox: { borderBottom: `1 solid ${BORDER}`, paddingVertical: 5 },
  commentMeta: { fontSize: 7, color: TEXT_MUTED, marginBottom: 2 },
  commentBody: { fontSize: 8 },
  signRow: { flexDirection: "row", marginTop: 16, borderTop: `1 solid ${BORDER}`, paddingTop: 10 },
  signCol: { flex: 1, paddingRight: 8 },
  signRoleTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  signatureArea: { height: 44, borderBottom: `1 solid ${BORDER}`, marginBottom: 6 },
  signLine: { fontSize: 8, color: TEXT_MUTED, marginBottom: 8 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 6, color: TEXT_MUTED, textAlign: "center", borderTop: `1 solid ${BORDER}`, paddingTop: 5 },
});

function statusColor(status: string) {
  if (status === "COMPLETED") return "#16a34a";
  if (status === "CANCELED") return "#dc2626";
  if (status === "IN_PROGRESS") return "#7c3aed";
  return NAVY;
}
function priorityColor(priority: string) {
  if (priority === "URGENT" || priority === "HIGH") return "#d97706";
  return NAVY;
}
function fmtDateTime(d: any) {
  return d ? new Date(d).toLocaleString() : "—";
}

export function WorkOrderReportDocument({ wo }: { wo: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.companyHeader}>
          <Image src={`${APP_URL}/logo.png`} style={styles.logoImage} />
          <Text style={styles.companyLine}>No.69, Street 103, Phum 8, Sangkat Beong Trabek, Khan Chamkarnom, Phnom Penh, Cambodia</Text>
          <Text style={styles.companyLine}>Hotline: +855 99 415 189 · Tel: (855) 23 990 001 · Fax: (855) 23 990 136</Text>
        </View>

        <Text style={styles.reportBanner}>SERVICE REPORT</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Report No.</Text><Text style={styles.metaValue}>{wo.id.slice(-8).toUpperCase()}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>S.O. No.</Text><Text style={styles.metaValue}>{wo.soNumber || "—"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Site / Location</Text><Text style={styles.metaValue}>{wo.site?.name || "—"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Asset</Text><Text style={styles.metaValue}>{wo.asset?.name || "—"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Team</Text><Text style={styles.metaValue}>{wo.team?.name || "—"}</Text></View>
          </View>
          <View style={styles.metaCol}>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Service type</Text><Text style={styles.metaValue}>{wo.serviceType ? SERVICE_TYPE_LABEL[wo.serviceType] : "—"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Discipline</Text><Text style={styles.metaValue}>{wo.discipline ? DISCIPLINE_LABEL[wo.discipline] : "—"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Technician</Text><Text style={styles.metaValue}>{wo.assignedTo?.name || "Unassigned"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Arrival</Text><Text style={styles.metaValue}>{fmtDateTime(wo.arrivalAt)}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Departure</Text><Text style={styles.metaValue}>{fmtDateTime(wo.departureAt)}</Text></View>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <Text style={[styles.badge, { backgroundColor: statusColor(wo.status) }]}>{wo.status.replace("_", " ")}</Text>
          <Text style={[styles.badge, { backgroundColor: priorityColor(wo.priority) }]}>{wo.priority}</Text>
          {wo.warrantyClaim && <Text style={[styles.badge, { backgroundColor: RED }]}>WARRANTY CLAIM</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{wo.title}</Text>
          <Text style={styles.bodyText}>{wo.description}</Text>
        </View>

        {wo.partsNeeded && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parts Supplied / Needed</Text>
            <Text style={styles.bodyText}>{wo.partsNeeded}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Fixed Upon Departure</Text>
          <View style={styles.fixedRow}>
            <Text style={styles.fixedLabel}>{wo.problemFixed === true ? "☑ Yes    ☐ No" : wo.problemFixed === false ? "☐ Yes    ☑ No" : "☐ Yes    ☐ No"}</Text>
          </View>
          {wo.problemFixed === false && wo.problemNotFixedReason && (
            <Text style={[styles.bodyText, { marginTop: 4 }]}>Reason: {wo.problemNotFixedReason}</Text>
          )}
        </View>

        {wo.warrantyClaim && (
          <View style={styles.warrantyBox}>
            <Text style={styles.warrantyText}>⚠ This work order is flagged as a warranty claim.</Text>
          </View>
        )}

        {wo.photos && wo.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({wo.photos.length})</Text>
            <View style={styles.photoGrid}>
              {wo.photos.map((p: any) => (
                <View key={p.id} style={styles.photoBox}>
                  {p.dataUri && <Image src={p.dataUri} style={styles.photo} />}
                  <Text style={styles.photoCaption}>{p.uploadedBy?.name} · {new Date(p.createdAt).toLocaleDateString()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {wo.comments && wo.comments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity Log</Text>
            {wo.comments.map((c: any) => (
              <View key={c.id} style={styles.commentBox}>
                <Text style={styles.commentMeta}>{c.author?.name} · {new Date(c.createdAt).toLocaleString()}</Text>
                <Text style={styles.commentBody}>{c.body}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.signRow}>
          <SignatureBlock role="ADTECH Technician" name={wo.assignedTo?.name} />
          <SignatureBlock role="Checked By" />
          <SignatureBlock role="Approved By" />
          <SignatureBlock role="Customer" />
        </View>

        <Text style={styles.footer} fixed>
          ADTECH Maintenance Work Order System · Generated {new Date().toLocaleString()} · No.69, Street 103, Phum 8, Sangkat Beong Trabek, Khan Chamkarnom, Phnom Penh, Cambodia · Hotline +855 99 415 189
        </Text>
      </Page>
    </Document>
  );
}

function SignatureBlock({ role, name }: { role: string; name?: string }) {
  return (
    <View style={styles.signCol}>
      <Text style={styles.signRoleTitle}>{role}</Text>
      <View style={styles.signatureArea} />
      <Text style={styles.signLine}>Name: {name || "____________"}</Text>
      <Text style={styles.signLine}>Position: ____________</Text>
      <Text style={styles.signLine}>Date: ____________</Text>
    </View>
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

export async function generateWorkOrderReportPdf(wo: any): Promise<Buffer> {
  const photosWithData = await Promise.all(
    (wo.photos || []).map(async (p: any) => ({ ...p, dataUri: await toDataUri(p.url) }))
  );
  const woWithPhotoData = { ...wo, photos: photosWithData };
  return renderToBuffer(<WorkOrderReportDocument wo={woWithPhotoData} />);
}