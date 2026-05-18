"use client";
import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import type { Invoice } from "@/lib/invoice-types";
import { BUSINESS_DETAILS } from "@/lib/invoice-business-details";

// Brand palette — single red accent + deep ink, generous neutrals
const C = {
  red: "#DC2626",
  redDark: "#991B1B",
  ink: "#111827",
  text: "#1F2937",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  border: "#E5E7EB",
  divider: "#D1D5DB",
  rowAlt: "#F9FAFB",
  panel: "#FAFAF9",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 60,
    paddingHorizontal: 0,
    fontSize: 10,
    color: C.text,
    fontFamily: "Helvetica",
  },

  // Top accent band
  accentBar: { height: 6, backgroundColor: C.red },

  // Header — logo left, INVOICE title right
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 48,
    paddingTop: 28,
    paddingBottom: 22,
  },
  logo: { width: 130, height: 50, objectFit: "contain" },
  brandFallback: { flexDirection: "column" },
  brandFallbackName: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.ink, letterSpacing: -0.5 },
  brandFallbackTag: { fontSize: 9, color: C.textMuted, marginTop: 2, fontStyle: "italic" },
  invoiceTitle: {
    fontSize: 30, fontFamily: "Helvetica-Bold", color: C.red, letterSpacing: 4,
  },
  invoiceTitleUnder: {
    fontSize: 9, color: C.textMuted, textAlign: "right", marginTop: 2, letterSpacing: 2,
  },

  thinDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 48 },

  // From + meta strip
  fromMetaRow: {
    flexDirection: "row",
    paddingHorizontal: 48,
    paddingTop: 22,
    paddingBottom: 8,
    gap: 32,
  },
  fromBlock: { flex: 1 },
  metaBlock: { width: 220 },

  sectionLabel: {
    fontSize: 8, color: C.textFaint, letterSpacing: 1.5,
    fontFamily: "Helvetica-Bold", marginBottom: 6,
  },

  // FROM
  fromName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 3 },
  fromLine: { fontSize: 9.5, color: C.text, lineHeight: 1.5 },
  fromMeta: { fontSize: 9, color: C.textMuted, lineHeight: 1.5, marginTop: 3 },

  // META (issue / due / number)
  metaRowLine: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5, borderBottomColor: C.border, borderBottomStyle: "solid",
  },
  metaRowLineLast: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 4,
  },
  metaLabel: { fontSize: 8.5, color: C.textMuted, letterSpacing: 0.8 },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.ink },
  metaValueAccent: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.red },

  // BILL TO
  billToBlock: {
    paddingHorizontal: 48, paddingTop: 16, paddingBottom: 20,
  },
  billToName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 4 },
  billToDetail: { fontSize: 9.5, color: C.textMuted, marginTop: 2 },

  // Table
  tableWrap: { paddingHorizontal: 48 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5, borderBottomColor: C.ink, borderBottomStyle: "solid",
    paddingBottom: 6, marginBottom: 2,
  },
  th: {
    fontSize: 9, fontFamily: "Helvetica-Bold", color: C.ink,
    letterSpacing: 0.5, textTransform: "uppercase",
  },
  thDesc: { flex: 1, textAlign: "left" },
  thQty: { width: 40, textAlign: "center" },
  thPrice: { width: 80, textAlign: "right" },
  thAmount: { width: 90, textAlign: "right" },

  tr: { flexDirection: "row", paddingVertical: 10, alignItems: "flex-start" },
  trAlt: {
    flexDirection: "row", paddingVertical: 10, alignItems: "flex-start",
    backgroundColor: C.rowAlt,
  },
  tdDesc: { flex: 1, paddingLeft: 4, paddingRight: 8 },
  tdQty: { width: 40, textAlign: "center", fontSize: 10 },
  tdPrice: { width: 80, textAlign: "right", fontSize: 10, paddingRight: 4 },
  tdAmount: { width: 90, textAlign: "right", fontSize: 10, paddingRight: 4 },

  itemHeading: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 3 },
  itemBody: { fontSize: 9, color: C.text, lineHeight: 1.5 },

  // Totals
  totalsBlock: {
    paddingHorizontal: 48,
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalsTable: { width: 220 },
  totalsRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 5,
  },
  totalsRowGrand: {
    flexDirection: "row", justifyContent: "space-between",
    paddingTop: 8, paddingBottom: 4, marginTop: 4,
    borderTopWidth: 1.5, borderTopColor: C.ink, borderTopStyle: "solid",
  },
  totalsLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 0.5 },
  totalsValue: { fontSize: 10, color: C.ink },
  totalsLabelGrand: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.ink, letterSpacing: 0.5 },
  totalsValueGrand: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.red },

  // Notes / payment panel
  notesPanel: {
    marginHorizontal: 48, marginTop: 24, padding: 14,
    backgroundColor: C.panel,
    borderLeftWidth: 3, borderLeftColor: C.red, borderLeftStyle: "solid",
  },
  notesPanelLabel: {
    fontSize: 8, color: C.red, letterSpacing: 1.5, fontFamily: "Helvetica-Bold", marginBottom: 6,
  },
  notesPanelText: { fontSize: 9.5, color: C.text, lineHeight: 1.5 },

  // Signatures
  signaturesBlock: {
    marginTop: 50, marginHorizontal: 48,
    flexDirection: "row", justifyContent: "space-between",
  },
  signature: { width: 140 },
  signatureLine: { borderBottomWidth: 0.75, borderBottomColor: C.ink, borderBottomStyle: "solid", marginBottom: 4 },
  signatureLabel: { fontSize: 8, color: C.textMuted, letterSpacing: 1, textTransform: "uppercase" },

  // Footer
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
  },
  footerLine: { height: 2, backgroundColor: C.red },
  footerContent: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 48, paddingTop: 10, paddingBottom: 12,
  },
  footerBrand: { fontSize: 8.5, color: C.text, letterSpacing: 0.5 },
  footerNote: { fontSize: 8, color: C.textFaint, letterSpacing: 0.3 },
});

interface Props {
  invoice: Invoice;
  logoUrl?: string;
}

function formatMoney(amount: number) {
  return `$${amount.toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDateLong(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function splitDescription(text: string): { heading: string; body: string } {
  const idx = text.indexOf("\n");
  if (idx === -1) return { heading: text, body: "" };
  return { heading: text.slice(0, idx).trim(), body: text.slice(idx + 1).replace(/^\n+/, "") };
}

export function InvoiceDocument({ invoice, logoUrl }: Props) {
  const src = logoUrl ?? BUSINESS_DETAILS.logoPath;
  const hasLogo = typeof src === "string" && src.length > 0;
  const subtotal = invoice.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={BUSINESS_DETAILS.name}>
      <Page size="A4" style={styles.page} wrap>

        {/* Top accent */}
        <View style={styles.accentBar} fixed />

        {/* Header */}
        <View style={styles.header}>
          {hasLogo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={src as string} style={styles.logo} />
          ) : (
            <View style={styles.brandFallback}>
              <Text style={styles.brandFallbackName}>{BUSINESS_DETAILS.name}</Text>
              <Text style={styles.brandFallbackTag}>{BUSINESS_DETAILS.tagline}</Text>
            </View>
          )}
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceTitleUnder}>{invoice.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.thinDivider} />

        {/* From + meta */}
        <View style={styles.fromMetaRow}>
          <View style={styles.fromBlock}>
            <Text style={styles.sectionLabel}>FROM</Text>
            <Text style={styles.fromName}>{BUSINESS_DETAILS.name}</Text>
            {BUSINESS_DETAILS.addressLines.map((line, i) => (
              <Text key={i} style={styles.fromLine}>{line}</Text>
            ))}
            <Text style={styles.fromMeta}>
              UEN {BUSINESS_DETAILS.uen}
              {BUSINESS_DETAILS.contact ? `  ·  ${BUSINESS_DETAILS.contact}` : ""}
            </Text>
          </View>

          <View style={styles.metaBlock}>
            <Text style={styles.sectionLabel}>INVOICE DETAILS</Text>
            <View style={styles.metaRowLine}>
              <Text style={styles.metaLabel}>NUMBER</Text>
              <Text style={styles.metaValueAccent}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.metaRowLine}>
              <Text style={styles.metaLabel}>ISSUE DATE</Text>
              <Text style={styles.metaValue}>{formatDateLong(invoice.issueDate)}</Text>
            </View>
            <View style={styles.metaRowLineLast}>
              <Text style={styles.metaLabel}>DUE DATE</Text>
              <Text style={styles.metaValue}>{formatDateLong(invoice.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Bill to */}
        <View style={styles.billToBlock}>
          <Text style={styles.sectionLabel}>BILL TO</Text>
          <Text style={styles.billToName}>{invoice.billToName || "—"}</Text>
          {invoice.billToEmail ? <Text style={styles.billToDetail}>{invoice.billToEmail}</Text> : null}
          {invoice.billToAddress ? <Text style={styles.billToDetail}>{invoice.billToAddress}</Text> : null}
        </View>

        {/* Items table */}
        <View style={styles.tableWrap}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.th, styles.thDesc]}>Description</Text>
            <Text style={[styles.th, styles.thQty]}>Qty</Text>
            <Text style={[styles.th, styles.thPrice]}>Price</Text>
            <Text style={[styles.th, styles.thAmount]}>Amount</Text>
          </View>

          {invoice.lineItems.length === 0 && (
            <View style={styles.tr}>
              <Text style={[styles.tdDesc, { color: C.textMuted, fontStyle: "italic" }]}>No line items</Text>
              <Text style={styles.tdQty}>—</Text>
              <Text style={styles.tdPrice}>—</Text>
              <Text style={styles.tdAmount}>—</Text>
            </View>
          )}

          {invoice.lineItems.map((li, i) => {
            const { heading, body } = splitDescription(li.description || "");
            const rowStyle = i % 2 === 1 ? styles.trAlt : styles.tr;
            return (
              <View key={li.id} style={rowStyle} wrap={false}>
                <View style={styles.tdDesc}>
                  {heading ? <Text style={styles.itemHeading}>{heading}</Text> : null}
                  {body ? <Text style={styles.itemBody}>{body}</Text> : null}
                </View>
                <Text style={styles.tdQty}>{li.qty}</Text>
                <Text style={styles.tdPrice}>{formatMoney(li.unitPrice)}</Text>
                <Text style={styles.tdAmount}>{formatMoney(li.lineTotal || li.qty * li.unitPrice)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>SUBTOTAL</Text>
              <Text style={styles.totalsValue}>{formatMoney(subtotal)}</Text>
            </View>
            <View style={styles.totalsRowGrand}>
              <Text style={styles.totalsLabelGrand}>TOTAL DUE</Text>
              <Text style={styles.totalsValueGrand}>{formatMoney(subtotal)}</Text>
            </View>
          </View>
        </View>

        {/* Notes / payment panel */}
        {(invoice.notes || invoice.paymentInstructions) ? (
          <View style={styles.notesPanel} wrap={false}>
            {invoice.paymentInstructions ? (
              <>
                <Text style={styles.notesPanelLabel}>PAYMENT</Text>
                {invoice.paymentInstructions.split("\n").map((line, i) => (
                  <Text key={`p${i}`} style={styles.notesPanelText}>{line}</Text>
                ))}
              </>
            ) : null}
            {invoice.notes ? (
              <>
                {invoice.paymentInstructions ? <Text style={{ marginTop: 8 }} /> : null}
                <Text style={styles.notesPanelLabel}>NOTES</Text>
                {invoice.notes.split("\n").map((line, i) => (
                  <Text key={`n${i}`} style={styles.notesPanelText}>{line}</Text>
                ))}
              </>
            ) : null}
          </View>
        ) : null}

        {/* Signatures */}
        <View style={styles.signaturesBlock} wrap={false}>
          {["Name / Title", "Customer Signature", "Date"].map((label) => (
            <View key={label} style={styles.signature}>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Footer (fixed bottom) */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLine} />
          <View style={styles.footerContent}>
            <Text style={styles.footerBrand}>
              {BUSINESS_DETAILS.name} · {BUSINESS_DETAILS.tagline}
            </Text>
            <Text style={styles.footerNote}>
              Invoice {invoice.invoiceNumber}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
