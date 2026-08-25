import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const NAVY = "#0e5c86";
const TEXT_MUTED = "#5b6b7a";
const BORDER = "#e1e5ea";
const APP_URL = process.env.NEXTAUTH_URL || "";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1c2b39" },
  companyHeader: { alignItems: "center", marginBottom: 10, borderBottom: `2 solid ${NAVY}`, paddingBottom: 8 },
  logoImage: { width: 150, height: 38, objectFit: "contain" },
  reportBanner: { backgroundColor: NAVY, color: "white", textAlign: "center", paddingVertical: 5, marginBottom: 10, fontSize: 11, fontFamily: "Helvetica-Bold" },
  metaRow: { flexDirection: "row", marginBottom: 10 },
  metaCol: { flex: 1 },
  metaLine: { flexDirection: "row", marginBottom: 3 },
  metaLabel: { fontSize: 8, color: TEXT_MUTED, width: 110 },
  metaValue: { fontSize: 9, flex: 1 },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: NAVY, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1 solid ${BORDER}`, paddingBottom: 2 },
  bodyText: { fontSize: 9, lineHeight: 1.5 },
  table: { border: `1 solid ${BORDER}` },
  tRow: { flexDirection: "row", borderBottom: `1 solid ${BORDER}` },
  tHeadRow: { flexDirection: "row", backgroundColor: "#f4f6f8", borderBottom: `1 solid ${BORDER}` },
  tCellH: { fontSize: 7, fontFamily: "Helvetica-Bold", padding: 4, color: NAVY },
  tCell: { fontSize: 7, padding: 4 },
  cItem: { width: "5%" }, cCode: { width: "12%" }, cName: { width: "18%" }, cDesc: { width: "20%" },
  cBrand: { width: "12%" }, cSupplier: { width: "13%" }, cUnit: { width: "7%" }, cQty: { width: "6%" }, cRemark: { width: "7%" },
  signRow: { flexDirection: "row", marginTop: 16, borderTop: `1 solid ${BORDER}`, paddingTop: 10, flexWrap: "wrap" },
  signCol: { width: "20%", paddingRight: 6, marginBottom: 10 },
  signRoleTitle: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  signatureArea: { height: 36, borderBottom: `1 solid ${BORDER}`, marginBottom: 6 },
  signLine: { fontSize: 7, color: TEXT_MUTED, marginBottom: 6 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, fontSize: 6, color: TEXT_MUTED, textAlign: "center", borderTop: `1 solid ${BORDER}`, paddingTop: 5 },
});

function SignatureBlock({ role }: { role: string }) {
  return (
    <View style={styles.signCol}>
      <Text style={styles.signRoleTitle}>{role}</Text>
      <View style={styles.signatureArea} />
      <Text style={styles.signLine}>Name: ________</Text>
      <Text style={styles.signLine}>Position: ________</Text>
      <Text style={styles.signLine}>Date: ________</Text>
    </View>
  );
}

const TYPE_LABEL: Record<string, string> = { MATERIAL: "Material", TOOL: "Tool", SERVICE: "Service" };

export function MaterialRequisitionDocument({ requisition }: { requisition: any }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.companyHeader}>
          <Image src={`${APP_URL}/logo.png`} style={styles.logoImage} />
        </View>
        <Text style={styles.reportBanner}>MATERIAL / SERVICE / TOOL REQUISITION FORM</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Reference</Text><Text style={styles.metaValue}>{requisition.referenceNo || requisition.id.slice(-8).toUpperCase()}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Date</Text><Text style={styles.metaValue}>{new Date(requisition.date).toLocaleDateString()}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Requisition for</Text><Text style={styles.metaValue}>{TYPE_LABEL[requisition.requisitionType] || requisition.requisitionType}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Object</Text><Text style={styles.metaValue}>{requisition.object || "—"}</Text></View>
          </View>
          <View style={styles.metaCol}>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Applicant name</Text><Text style={styles.metaValue}>{requisition.applicantName || "—"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>SO number</Text><Text style={styles.metaValue}>{requisition.soNumber || "—"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Project name</Text><Text style={styles.metaValue}>{requisition.projectName || "—"}</Text></View>
            <View style={styles.metaLine}><Text style={styles.metaLabel}>Expected delivery</Text><Text style={styles.metaValue}>{requisition.expectedDelivery ? new Date(requisition.expectedDelivery).toLocaleDateString() : "—"}</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.table}>
            <View style={styles.tHeadRow}>
              <Text style={[styles.tCellH, styles.cItem]}>No.</Text>
              <Text style={[styles.tCellH, styles.cCode]}>Product Code</Text>
              <Text style={[styles.tCellH, styles.cName]}>Product Name / Service</Text>
              <Text style={[styles.tCellH, styles.cDesc]}>Description</Text>
              <Text style={[styles.tCellH, styles.cBrand]}>Brand</Text>
              <Text style={[styles.tCellH, styles.cSupplier]}>Supplier</Text>
              <Text style={[styles.tCellH, styles.cUnit]}>Unit</Text>
              <Text style={[styles.tCellH, styles.cQty]}>Qty</Text>
              <Text style={[styles.tCellH, styles.cRemark]}>Remark</Text>
            </View>
            {requisition.items.map((it: any) => (
              <View key={it.id} style={styles.tRow}>
                <Text style={[styles.tCell, styles.cItem]}>{it.itemNo}</Text>
                <Text style={[styles.tCell, styles.cCode]}>{it.productCode || ""}</Text>
                <Text style={[styles.tCell, styles.cName]}>{it.productName || ""}</Text>
                <Text style={[styles.tCell, styles.cDesc]}>{it.description || ""}</Text>
                <Text style={[styles.tCell, styles.cBrand]}>{it.brandName || ""}</Text>
                <Text style={[styles.tCell, styles.cSupplier]}>{it.supplier || ""}</Text>
                <Text style={[styles.tCell, styles.cUnit]}>{it.unit || ""}</Text>
                <Text style={[styles.tCell, styles.cQty]}>{it.qty ?? ""}</Text>
                <Text style={[styles.tCell, styles.cRemark]}>{it.remark || ""}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.signRow}>
          <SignatureBlock role="Requested By" />
          <SignatureBlock role="Checked By" />
          <SignatureBlock role="Checked By" />
          <SignatureBlock role="Acknowledge By" />
          <SignatureBlock role="Approved By" />
        </View>

        <Text style={styles.footer} fixed>
          ADTECH Co., LTD · No.69, Street 103, Phum 8, Sangkat Beong Trabek, Khan Chamkarnom, Phnom Penh, Cambodia · Hotline +855 99 415 189
        </Text>
      </Page>
    </Document>
  );
}

export async function generateMaterialRequisitionPdf(requisition: any): Promise<Buffer> {
  return renderToBuffer(<MaterialRequisitionDocument requisition={requisition} />);
}