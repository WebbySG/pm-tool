"use client";
import {
  Document, Page, Text, View, StyleSheet, Image, Svg, Polygon,
} from "@react-pdf/renderer";
import type { Invoice } from "@/lib/invoice-types";
import { BUSINESS_DETAILS } from "@/lib/invoice-business-details";

const C = {
  red: "#DC2626",
  navy: "#1E3A8A",
  navyDark: "#0F1F4F",
  blue: "#3B82F6",
  blueLight: "#93C5FD",
  blueFaint: "#DBEAFE",
  lavender: "#E5E9F8",
  text: "#1F2937",
  textMuted: "#6B7280",
  border: "#D1D5DB",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 70,
    paddingHorizontal: 48,
    fontSize: 10,
    color: C.text,
    fontFamily: "Helvetica",
    position: "relative",
  },
  // Decorative corner stripes
  cornerTopRight: { position: "absolute", top: 0, right: 0, width: 230, height: 50 },
  cornerBottomLeft: { position: "absolute", bottom: 0, left: 0, width: 230, height: 50 },

  // Header
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 24 },
  brandBlock: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  logo: { width: 110, height: 44, objectFit: "contain" },
  brandText: { flexDirection: "column" },
  brandName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.red, marginBottom: 2 },
  brandTagline: { fontSize: 8, color: C.textMuted, fontStyle: "italic", marginBottom: 6 },
  brandLine: { fontSize: 9, color: C.text, lineHeight: 1.4 },
  invoiceTitle: { fontSize: 28, fontFamily: "Helvetica-Bold", color: C.navy, letterSpacing: 1 },

  // Address block
  addressBlock: { marginTop: 10, marginBottom: 22 },
  addressLine: { fontSize: 9, color: C.text, lineHeight: 1.5 },

  // Bill-to + meta row
  metaRow: { flexDirection: "row", marginBottom: 14 },
  billTo: { flex: 1 },
  billToLabel: { fontSize: 9, color: C.text, fontFamily: "Helvetica-Oblique" },
  billToName: { fontSize: 10, color: C.text, fontFamily: "Helvetica-Oblique" },
  billToDetail: { fontSize: 9, color: C.textMuted, marginTop: 2 },
  metaRight: { width: 200, flexDirection: "column", alignItems: "flex-end" },
  metaRowLine: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 2 },
  metaLabel: { fontSize: 9, color: C.text },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-BoldOblique", color: C.text },

  // Table
  tableWrap: { borderWidth: 1, borderColor: C.navy, borderStyle: "solid" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.navy,
    color: C.white,
  },
  th: {
    fontSize: 10, fontFamily: "Helvetica-Bold", color: C.white,
    paddingVertical: 8, paddingHorizontal: 8,
  },
  thItem: { flex: 1, textAlign: "left" },
  thQty: { width: 50, textAlign: "center", borderLeftWidth: 1, borderLeftColor: C.white, borderLeftStyle: "solid" },
  thPrice: { width: 80, textAlign: "right", borderLeftWidth: 1, borderLeftColor: C.white, borderLeftStyle: "solid" },
  thTotal: { width: 80, textAlign: "right", borderLeftWidth: 1, borderLeftColor: C.white, borderLeftStyle: "solid" },

  tr: {
    flexDirection: "row",
    borderTopWidth: 1, borderTopColor: C.border, borderTopStyle: "solid",
  },
  tdItem: { flex: 1, paddingVertical: 10, paddingHorizontal: 8 },
  tdQty: {
    width: 50, paddingVertical: 10, paddingHorizontal: 6, textAlign: "center",
    borderLeftWidth: 1, borderLeftColor: C.border, borderLeftStyle: "solid",
    fontSize: 10,
  },
  tdPrice: {
    width: 80, paddingVertical: 10, paddingHorizontal: 8, textAlign: "right",
    borderLeftWidth: 1, borderLeftColor: C.border, borderLeftStyle: "solid",
    fontSize: 10,
  },
  tdTotal: {
    width: 80, paddingVertical: 10, paddingHorizontal: 8, textAlign: "right",
    borderLeftWidth: 1, borderLeftColor: C.border, borderLeftStyle: "solid",
    fontSize: 10,
  },
  itemHeading: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.text, marginBottom: 4 },
  itemBody: { fontSize: 9, color: C.text, lineHeight: 1.5 },

  // Total row
  totalRow: {
    flexDirection: "row",
    backgroundColor: C.lavender,
    borderTopWidth: 1, borderTopColor: C.navy, borderTopStyle: "solid",
  },
  totalLabelCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, alignItems: "flex-end" },
  totalLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.text },
  totalAmountCell: {
    width: 80, paddingVertical: 10, paddingHorizontal: 8, textAlign: "right",
    borderLeftWidth: 1, borderLeftColor: C.navy, borderLeftStyle: "solid",
  },
  totalAmount: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.text },

  // Notes + footer
  notesBlock: { marginTop: 18 },
  notesLine: { fontSize: 9, color: C.text, lineHeight: 1.5 },

  signaturesBlock: {
    marginTop: 60,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  signature: { width: 150 },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: C.blueLight, borderBottomStyle: "solid", marginBottom: 4 },
  signatureLabel: { fontSize: 8, color: C.textMuted, letterSpacing: 0.5 },
});

interface Props {
  invoice: Invoice;
  // Optional override of logo URL (e.g. signed URL or external host)
  logoUrl?: string;
}

function formatMoney(amount: number) {
  return `$${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Splits a description into a heading (first line) + body (rest)
function splitDescription(text: string): { heading: string; body: string } {
  const idx = text.indexOf("\n");
  if (idx === -1) return { heading: text, body: "" };
  return { heading: text.slice(0, idx).trim(), body: text.slice(idx + 1).replace(/^\n+/, "") };
}

// Top-right and bottom-left decorative chevrons (matches existing brand)
function CornerStripeTopRight() {
  return (
    <Svg style={styles.cornerTopRight} viewBox="0 0 230 50">
      <Polygon points="230,0 230,50 100,0" fill={C.navyDark} />
      <Polygon points="230,12 230,46 130,12" fill={C.blue} />
      <Polygon points="230,28 230,46 165,28" fill={C.blueLight} />
    </Svg>
  );
}
function CornerStripeBottomLeft() {
  return (
    <Svg style={styles.cornerBottomLeft} viewBox="0 0 230 50">
      <Polygon points="0,50 0,0 130,50" fill={C.navyDark} />
      <Polygon points="0,38 0,4 100,38" fill={C.blue} />
      <Polygon points="0,22 0,4 65,22" fill={C.blueLight} />
    </Svg>
  );
}

export function InvoiceDocument({ invoice, logoUrl }: Props) {
  const src = logoUrl ?? BUSINESS_DETAILS.logoPath;
  const subtotal = invoice.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
  const hasLogo = typeof src === "string" && src.length > 0;

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={BUSINESS_DETAILS.name}>
      <Page size="A4" style={styles.page} wrap>

        <CornerStripeTopRight />

        {/* Header: logo + brand on left, INVOICE on right */}
        <View style={styles.headerRow}>
          <View style={styles.brandBlock}>
            {hasLogo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={src as string} style={styles.logo} />
            ) : null}
            <View style={styles.brandText}>
              {!hasLogo && <Text style={styles.brandName}>{BUSINESS_DETAILS.name}</Text>}
              {!hasLogo && <Text style={styles.brandTagline}>{BUSINESS_DETAILS.tagline}</Text>}
              {BUSINESS_DETAILS.contact && (
                <Text style={styles.brandLine}>Contact: {BUSINESS_DETAILS.contact}</Text>
              )}
              <Text style={styles.brandLine}>UEN: {BUSINESS_DETAILS.uen}</Text>
            </View>
          </View>
          <Text style={styles.invoiceTitle}>INVOICE</Text>
        </View>

        {/* Address block */}
        <View style={styles.addressBlock}>
          {BUSINESS_DETAILS.addressLines.map((line, i) => (
            <Text key={i} style={styles.addressLine}>{line}</Text>
          ))}
        </View>

        {/* Bill-to + invoice meta */}
        <View style={styles.metaRow}>
          <View style={styles.billTo}>
            <Text style={styles.billToLabel}>
              BILL TO: <Text style={styles.billToName}>{invoice.billToName || "—"}</Text>
            </Text>
            {invoice.billToAddress ? (
              <Text style={styles.billToDetail}>{invoice.billToAddress}</Text>
            ) : null}
            {invoice.billToEmail ? (
              <Text style={styles.billToDetail}>{invoice.billToEmail}</Text>
            ) : null}
          </View>
          <View style={styles.metaRight}>
            <View style={styles.metaRowLine}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.metaRowLine}>
              <Text style={styles.metaLabel}>Invoice #:</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRowLine}>
              <Text style={styles.metaLabel}>Due:</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.tableWrap}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.th, styles.thItem]}>ITEM</Text>
            <Text style={[styles.th, styles.thQty]}>QTY</Text>
            <Text style={[styles.th, styles.thPrice]}>PRICE ($)</Text>
            <Text style={[styles.th, styles.thTotal]}>TOTAL ($)</Text>
          </View>

          {invoice.lineItems.length === 0 && (
            <View style={styles.tr}>
              <Text style={[styles.tdItem, { color: C.textMuted, fontStyle: "italic" }]}>No line items</Text>
              <Text style={styles.tdQty}>—</Text>
              <Text style={styles.tdPrice}>—</Text>
              <Text style={styles.tdTotal}>—</Text>
            </View>
          )}

          {invoice.lineItems.map((li) => {
            const { heading, body } = splitDescription(li.description || "");
            return (
              <View key={li.id} style={styles.tr} wrap={false}>
                <View style={styles.tdItem}>
                  {heading ? <Text style={styles.itemHeading}>{heading}</Text> : null}
                  {body ? <Text style={styles.itemBody}>{body}</Text> : null}
                </View>
                <Text style={styles.tdQty}>{li.qty}</Text>
                <Text style={styles.tdPrice}>{formatMoney(li.unitPrice)}</Text>
                <Text style={styles.tdTotal}>{formatMoney(li.lineTotal || li.qty * li.unitPrice)}</Text>
              </View>
            );
          })}

          {/* TOTAL */}
          <View style={styles.totalRow}>
            <View style={styles.totalLabelCell}><Text style={styles.totalLabel}>TOTAL</Text></View>
            <Text style={[styles.totalAmountCell, styles.totalAmount]}>{formatMoney(subtotal)}</Text>
          </View>
        </View>

        {/* Notes + payment instructions */}
        {(invoice.notes || invoice.paymentInstructions) ? (
          <View style={styles.notesBlock}>
            {invoice.notes ? (
              invoice.notes.split("\n").map((line, i) => (
                <Text key={`n${i}`} style={styles.notesLine}>{line}</Text>
              ))
            ) : null}
            {invoice.paymentInstructions ? (
              invoice.paymentInstructions.split("\n").map((line, i) => (
                <Text key={`p${i}`} style={styles.notesLine}>{line}</Text>
              ))
            ) : null}
          </View>
        ) : null}

        {/* Signatures */}
        <View style={styles.signaturesBlock} wrap={false}>
          {["NAME/TITLE", "CUSTOMER SIGNATURE", "DATE"].map((label) => (
            <View key={label} style={styles.signature}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <CornerStripeBottomLeft />
      </Page>
    </Document>
  );
}
