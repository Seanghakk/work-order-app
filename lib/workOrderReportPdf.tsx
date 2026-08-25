import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const NAVY = "#0e5c86";
const NAVY_DEEP = "#0a3f5c";
const RED = "#c62430";
const TEXT_MUTED = "#5b6b7a";
const BORDER = "#e1e5ea";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1c2b39" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: `2 solid ${NAVY}`, paddingBottom: 10 },
  logoText: { fontSize: 18, fontFamily: "Helvetica-Bold", color: NAVY },
  logoSub: { fontSize: 8, color: TEXT_MUTED },
  reportTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: NAVY_DEEP, textAlign: "right" },
  reportDate: { fontSize: 8, color: TEXT_MUTED, textAlign: "right", marginTop: 2 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  badgeRow: { flexDirection: "row", gap: 6, marginBottom: 14 },
  badge: { fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3, color: "white" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap" },
  metaItem: { width: "50%", marginBottom: 6 },
  metaLabel: { fontSize: 8, color: TEXT_MUTED },
  metaValue: { fontSize: 10 },
  bodyText: { fontSize: 10, lineHeight: 1.5 },
  warrantyBox: { backgroundColor: "#fdeceb", border: `1 solid ${RED}`, borderRadius: 4, padding: 8, marginBottom: 14 },
  warrantyText: { fontSize: 10, fontFamily: "Helvetica-Bold", color: RED },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoBox: { width: 150, marginBottom: 10 },
  photo: { width: 150, height: 110, objectFit: "cover", borderRadius: 3, border: `1 solid ${BORDER}` },
  photoCaption: { fontSize: 7, color: TEXT_MUTED, marginTop: 3 },
  commentBox: { borderBottom: `1 solid ${BORDER}`, paddingVertical: 6 },
  commentMeta: { fontSize: 8, color: TEXT_MUTED, marginBottom: 2 },
  commentBody: { fontSize: 9 },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 7, color: TEXT_MUTED, textAlign: "center", borderTop: `1 solid ${BORDER}`, paddingTop: 6 },
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

export function WorkOrderReportDocument({ wo }: { wo: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.logoText}>ADTECH</Text>
            <Text style={styles.logoSub}>Automation Advance Technology (Cambodia) Co., Ltd</Text>
          </View>
          <View>
            <Text style={styles.reportTitle}>Work Order Report</Text>
            <Text style={styles.reportDate}>Generated {new Date().toLocaleString()}</Text>
          </View>
        </View>

        <Text style={styles.title}>{wo.title}</Text>
        <View style={styles.badgeRow}>
          <Text style={[styles.badge, { backgroundColor: statusColor(wo.status) }]}>{wo.status.replace("_", " ")}</Text>
          <Text style={[styles.badge, { backgroundColor: priorityColor(wo.priority) }]}>{wo.priority}</Text>
          {wo.warrantyClaim && <Text style={[styles.badge, { backgroundColor: RED }]}>WARRANTY CLAIM</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Site</Text><Text style={styles.metaValue}>{wo.site?.name || "—"}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Team</Text><Text style={styles.metaValue}>{wo.team?.name || "—"}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Asset</Text><Text style={styles.metaValue}>{wo.asset?.name || "—"}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Requested by</Text><Text style={styles.metaValue}>{wo.requestedBy?.name || "—"}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Assigned to</Text><Text style={styles.metaValue}>{wo.assignedTo?.name || "Unassigned"}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Created</Text><Text style={styles.metaValue}>{new Date(wo.createdAt).toLocaleDateString()}</Text></View>
            {wo.completedAt && <View style={styles.metaItem}><Text style={styles.metaLabel}>Completed</Text><Text style={styles.metaValue}>{new Date(wo.completedAt).toLocaleDateString()}</Text></View>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.bodyText}>{wo.description}</Text>
        </View>

        {wo.partsNeeded && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Parts Needed</Text>
            <Text style={styles.bodyText}>{wo.partsNeeded}</Text>
          </View>
        )}

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
                  <Image src={p.url} style={styles.photo} />
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

        <Text style={styles.footer} fixed>
          ADTECH Maintenance Work Order System · This report was generated automatically.
        </Text>
      </Page>
    </Document>
  );
}

export async function generateWorkOrderReportPdf(wo: any): Promise<Buffer> {
  return renderToBuffer(<WorkOrderReportDocument wo={wo} />);
}