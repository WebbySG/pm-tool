"use client";
import {
  Document, Page, Text, View, StyleSheet, Image,
  Svg, Circle, Path, G,
  Text as SvgText,
} from "@react-pdf/renderer";
import type { Invoice } from "@/lib/invoice-types";
import { computeDerivedStatus, computeInvoiceTotals } from "@/lib/invoice-types";
import { BUSINESS_DETAILS } from "@/lib/invoice-business-details";

// Brand palette
const C = {
  red: "#DC2626",
  redDark: "#991B1B",
  redSoft: "#FEE2E2",
  ink: "#111827",
  text: "#1F2937",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  border: "#E5E7EB",
  divider: "#D1D5DB",
  rowAlt: "#F9FAFB",
  panel: "#FAFAF9",
  green: "#16A34A",
  greenSoft: "#DCFCE7",
  amber: "#D97706",
  white: "#FFFFFF",
};

// A4 dimensions in points (used for absolute positioning)
const PAGE_W = 595.28;
const PAGE_H = 841.89;

const styles = StyleSheet.create({
  page: {
    paddingTop: 40, // top reserve so the running header (continuation pages) has room
    paddingBottom: 58, // reserve for the fixed footer pinned at the page bottom
    paddingHorizontal: 0,
    paddingLeft: 18, // visual gutter inside the left accent strip
    fontSize: 10,
    color: C.text,
    fontFamily: "Helvetica",
  },

  // ─── Background / decorations ───────────────────────────────────────────
  leftAccent: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    width: 8, backgroundColor: C.red,
  },
  topRightDecor: {
    position: "absolute", top: 0, right: 0, width: 130, height: 130,
  },
  bottomRightDecor: {
    position: "absolute", bottom: 50, right: 30, width: 120, height: 90,
  },
  cornerDots: {
    position: "absolute", top: 12, right: 150, width: 60, height: 60,
  },
  watermark: {
    position: "absolute", top: 280, left: 0, right: 0, height: 200,
  },

  // ─── Header ─────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingTop: 4, // page already reserves 40pt at the top
    paddingBottom: 12,
  },

  // ─── Running header (continuation pages only) ───────────────────────────
  runningHeader: { position: "absolute", top: 0, left: 0, right: 0 },
  runningHeaderContent: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 40, paddingTop: 12, paddingBottom: 8,
  },
  runningHeaderBrand: { fontSize: 8.5, color: C.text, letterSpacing: 0.5, fontFamily: "Helvetica-Bold" },
  runningHeaderNote: { fontSize: 8, color: C.textFaint, letterSpacing: 0.3 },
  runningHeaderLine: { height: 2, backgroundColor: C.red, marginLeft: 8 },
  logo: { width: 130, height: 50, objectFit: "contain" },
  brandFallback: { flexDirection: "column" },
  brandFallbackName: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.ink, letterSpacing: -0.5 },
  brandFallbackTag: { fontSize: 9, color: C.textMuted, marginTop: 2, fontStyle: "italic" },

  titleBlock: { alignItems: "flex-end" },
  invoiceTitle: {
    fontSize: 32, fontFamily: "Helvetica-Bold", color: C.red, letterSpacing: 4,
    marginBottom: 4,
  },
  invoiceTitleUnder: {
    fontSize: 10, color: C.ink, letterSpacing: 2,
    fontFamily: "Helvetica-Bold",
  },

  thinDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 40 },

  // ─── FROM + meta ────────────────────────────────────────────────────────
  fromMetaRow: {
    flexDirection: "row",
    paddingHorizontal: 40, paddingTop: 12, paddingBottom: 4,
    gap: 32,
  },
  fromBlock: { flex: 1 },
  metaBlock: { width: 220 },

  sectionLabel: {
    fontSize: 8, color: C.red, letterSpacing: 1.8,
    fontFamily: "Helvetica-Bold", marginBottom: 8,
  },

  fromContactName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 2 },
  fromContactSub: { fontSize: 10, color: C.text, lineHeight: 1.4, marginBottom: 1 },
  fromAddrTop: { fontSize: 9.5, color: C.text, lineHeight: 1.4, marginTop: 5 },

  metaRowLine: {
    flexDirection: "row", justifyContent: "space-between",
    paddingVertical: 5,
    borderBottomWidth: 0.5, borderBottomColor: C.border, borderBottomStyle: "solid",
  },
  metaRowLineLast: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 5,
  },
  metaLabel: { fontSize: 8.5, color: C.textMuted, letterSpacing: 0.8 },
  metaValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.ink },
  metaValueAccent: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: C.red },

  // ─── BILL TO ────────────────────────────────────────────────────────────
  billToBlock: {
    paddingHorizontal: 40, paddingTop: 10, paddingBottom: 8,
  },
  billToName: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 4 },
  billToClient: { fontSize: 11, color: C.text, marginTop: 2 },
  billToDetail: { fontSize: 9.5, color: C.textMuted, marginTop: 2 },

  // ─── Table ──────────────────────────────────────────────────────────────
  tableWrap: { paddingHorizontal: 40, marginTop: 4 },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5, borderBottomColor: C.ink, borderBottomStyle: "solid",
    paddingBottom: 6, marginBottom: 2,
  },
  th: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.ink, letterSpacing: 0.5 },
  thDesc: { flex: 1, textAlign: "left" },
  thQty: { width: 40, textAlign: "center" },
  thPrice: { width: 80, textAlign: "right" },
  thAmount: { width: 90, textAlign: "right" },

  tr: { flexDirection: "row", paddingVertical: 7, alignItems: "flex-start" },
  trAlt: {
    flexDirection: "row", paddingVertical: 7, alignItems: "flex-start",
    backgroundColor: C.rowAlt,
  },
  tdDesc: { flex: 1, paddingLeft: 6, paddingRight: 8 },
  tdQty: { width: 40, textAlign: "center", fontSize: 10, paddingTop: 1 },
  tdPrice: { width: 80, textAlign: "right", fontSize: 10, paddingRight: 6, paddingTop: 1 },
  tdAmount: { width: 90, textAlign: "right", fontSize: 10, paddingRight: 6, paddingTop: 1 },

  itemHeading: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: C.ink, marginBottom: 3 },
  itemBody: { fontSize: 9, color: C.text, lineHeight: 1.35 },

  // ─── Totals ─────────────────────────────────────────────────────────────
  totalsBlock: {
    paddingHorizontal: 40, marginTop: 8,
    flexDirection: "row", justifyContent: "flex-end",
  },
  totalsTable: { width: 230 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  totalsRowGrand: {
    flexDirection: "row", justifyContent: "space-between",
    paddingTop: 10, paddingBottom: 6, marginTop: 4,
    borderTopWidth: 1.5, borderTopColor: C.red, borderTopStyle: "solid",
  },
  totalsLabel: { fontSize: 10, color: C.textMuted, letterSpacing: 0.5 },
  totalsValue: { fontSize: 10, color: C.ink },
  totalsLabelGrand: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.ink, letterSpacing: 0.5 },
  totalsValueGrand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.red },

  // ─── Notes panel ────────────────────────────────────────────────────────
  notesPanel: {
    marginHorizontal: 40, marginTop: 12, padding: 11,
    backgroundColor: C.panel,
    borderLeftWidth: 3, borderLeftColor: C.red, borderLeftStyle: "solid",
  },
  notesPanelLabel: {
    fontSize: 8, color: C.red, letterSpacing: 1.5, fontFamily: "Helvetica-Bold", marginBottom: 6,
  },
  notesPanelText: { fontSize: 9.5, color: C.text, lineHeight: 1.5 },

  // ─── Bottom block: totals + payment + signatures, flows in right after the table ──
  // Kept together (wrap={false}) so the cluster never splits across a page break;
  // flowing in-line means a short invoice has no mid-page whitespace gap.
  bottomBlock: {
    marginTop: 12,
  },
  signaturesRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingLeft: 50, paddingRight: 40, marginTop: 16,
  },

  // ─── Signatures (absolutely pinned at bottom of last page) ──────────────
  signaturesBlock: {
    position: "absolute",
    bottom: 155, // sits above the bottom-right decoration (which tops out at ~140)
    left: 60, right: 30,
    flexDirection: "row", justifyContent: "space-between",
  },
  signature: { width: 140 },
  signatureLine: {
    borderBottomWidth: 0.75, borderBottomColor: C.ink, borderBottomStyle: "solid", marginBottom: 4,
  },
  signatureLabel: { fontSize: 8, color: C.textMuted, letterSpacing: 1 },

  // ─── Footer ─────────────────────────────────────────────────────────────
  footer: { position: "absolute", bottom: 0, left: 0, right: 0 },
  footerLine: { height: 2, backgroundColor: C.red, marginLeft: 8 },
  footerContent: {
    flexDirection: "row", justifyContent: "space-between",
    paddingHorizontal: 40, paddingTop: 10, paddingBottom: 14,
  },
  footerBrand: { fontSize: 8.5, color: C.text, letterSpacing: 0.5, fontFamily: "Helvetica-Bold" },
  footerNote: { fontSize: 8, color: C.textFaint, letterSpacing: 0.3 },
  footerPageNum: { fontSize: 8, color: C.textFaint, letterSpacing: 0.5 },
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

// ─── Decorative SVG components ────────────────────────────────────────────

// Top-right cluster: overlapping circles in brand colors
function TopRightDecor() {
  return (
    <Svg style={styles.topRightDecor} viewBox="0 0 130 130">
      <G>
        <Circle cx={105} cy={25} r={55} fill={C.red} opacity={0.08} />
        <Circle cx={115} cy={15} r={35} fill={C.red} opacity={0.14} />
        <Circle cx={125} cy={5}  r={18} fill={C.red} opacity={0.6} />
        <Circle cx={100} cy={40} r={6}  fill={C.ink} opacity={0.5} />
      </G>
    </Svg>
  );
}

// Bottom-right corner: arcs + dots evoking a stylized wave or sun rays
function BottomRightDecor() {
  return (
    <Svg style={styles.bottomRightDecor} viewBox="0 0 120 90">
      <G>
        {/* concentric arc rings (3D-ish ripple) */}
        <Path d="M 30 90 A 50 50 0 0 1 130 90" stroke={C.red} strokeWidth={1.5} fill="none" opacity={0.35} />
        <Path d="M 50 90 A 35 35 0 0 1 120 90" stroke={C.red} strokeWidth={1.2} fill="none" opacity={0.55} />
        <Path d="M 65 90 A 22 22 0 0 1 109 90" stroke={C.red} strokeWidth={1} fill="none" opacity={0.8} />
        {/* sun core */}
        <Circle cx={87} cy={90} r={10} fill={C.red} opacity={0.85} />
        <Circle cx={87} cy={90} r={5}  fill={C.white} />
        {/* tiny accent dots */}
        <Circle cx={40} cy={40} r={2} fill={C.ink} opacity={0.35} />
        <Circle cx={55} cy={28} r={1.5} fill={C.red} opacity={0.5} />
        <Circle cx={70} cy={18} r={1} fill={C.ink} opacity={0.35} />
      </G>
    </Svg>
  );
}

// Scattered dot pattern (top header area accent)
function CornerDots() {
  const cols = 6, rows = 6, gap = 8;
  return (
    <Svg style={styles.cornerDots} viewBox={`0 0 ${cols * gap} ${rows * gap}`}>
      <G>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const dist = Math.abs(r - rows / 2) + Math.abs(c - cols / 2);
            const opacity = Math.max(0.08, 0.4 - dist * 0.05);
            return (
              <Circle
                key={`${r}-${c}`}
                cx={c * gap + 2} cy={r * gap + 2} r={0.9}
                fill={C.ink} opacity={opacity}
              />
            );
          }),
        )}
      </G>
    </Svg>
  );
}

// Big diagonal status watermark for DRAFT / PAID / VOID
function StatusWatermark({ label, color }: { label: string; color: string }) {
  return (
    <Svg style={styles.watermark} viewBox={`0 0 ${PAGE_W} 200`}>
      <SvgText
        x={PAGE_W / 2} y={130}
        style={{ fontSize: 120, fontFamily: "Helvetica-Bold" }}
        fill={color} fillOpacity={0.06}
        textAnchor="middle"
        transform={`rotate(-18 ${PAGE_W / 2} 130)`}
      >
        {label}
      </SvgText>
    </Svg>
  );
}

export function InvoiceDocument({ invoice, logoUrl }: Props) {
  const src = logoUrl ?? BUSINESS_DETAILS.logoPath;
  const hasLogo = typeof src === "string" && src.length > 0;
  const { subtotal, discountAmount, total } = computeInvoiceTotals({
    lineItems: invoice.lineItems,
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
  });
  const hasDiscount = discountAmount > 0;
  const discountLabel = invoice.discountType === "percent"
    ? `DISCOUNT (${invoice.discountValue}%)`
    : "DISCOUNT";

  const derived = computeDerivedStatus(invoice);
  const watermark = (() => {
    if (derived === "paid") return { label: "PAID", color: C.green };
    if (derived === "overdue") return { label: "OVERDUE", color: C.red };
    if (invoice.status === "void") return { label: "VOID", color: C.textMuted };
    return null;
  })();

  return (
    <Document title={`Invoice ${invoice.invoiceNumber}`} author={BUSINESS_DETAILS.name}>
      <Page size="A4" style={styles.page} wrap>

        {/* Background decorations — fixed = appear on every page */}
        <View style={styles.leftAccent} fixed />
        <TopRightDecor />
        <CornerDots />

        {/* Running header — repeats on every continuation page (not page 1) */}
        <View
          style={styles.runningHeader}
          fixed
          render={(args: unknown) => {
            const { pageNumber } = args as { pageNumber: number };
            if (pageNumber === 1) return null;
            return (
              <>
                <View style={styles.runningHeaderContent}>
                  <Text style={styles.runningHeaderBrand}>
                    {BUSINESS_DETAILS.name} · INVOICE {invoice.invoiceNumber}
                  </Text>
                  <Text style={styles.runningHeaderNote}>continued</Text>
                </View>
                <View style={styles.runningHeaderLine} />
              </>
            );
          }}
        />

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
          <View style={styles.titleBlock}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceTitleUnder}>{invoice.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.thinDivider} />

        {/* Watermark sits behind the body content */}
        {watermark ? <StatusWatermark label={watermark.label} color={watermark.color} /> : null}

        {/* FROM + meta */}
        <View style={styles.fromMetaRow}>
          <View style={styles.fromBlock}>
            <Text style={styles.sectionLabel}>FROM</Text>
            <Text style={styles.fromContactName}>{BUSINESS_DETAILS.contactPerson}</Text>
            <Text style={styles.fromContactSub}>{BUSINESS_DETAILS.contactPhone}</Text>
            <Text style={styles.fromContactSub}>UEN: {BUSINESS_DETAILS.uen}</Text>
            {BUSINESS_DETAILS.addressLines.map((line, i) => (
              <Text key={i} style={i === 0 ? styles.fromAddrTop : styles.fromContactSub}>{line}</Text>
            ))}
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
          {invoice.billToAttention ? <Text style={styles.billToClient}>{invoice.billToAttention}</Text> : null}
          {invoice.billToAddress ? <Text style={styles.billToDetail}>{invoice.billToAddress}</Text> : null}
        </View>

        {/* Items table */}
        <View style={styles.tableWrap}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.th, styles.thDesc]}>DESCRIPTION</Text>
            <Text style={[styles.th, styles.thQty]}>QTY</Text>
            <Text style={[styles.th, styles.thPrice]}>PRICE</Text>
            <Text style={[styles.th, styles.thAmount]}>AMOUNT</Text>
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
              // No wrap={false}: a long description flows and fills the page (and
              // continues onto the next) instead of jumping whole to the next page
              // and leaving the first page empty.
              <View key={li.id} style={rowStyle}>
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

        {/* Total Due + Payment + Signatures — flow in right after the items table and are
            kept together (wrap={false}) so the cluster never splits across a page break.
            Flowing in-line (rather than absolute-pinning to the page bottom) means a short
            invoice has no large mid-page whitespace gap. */}
        <View style={styles.bottomBlock} wrap={false}>
          {/* Totals */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalsTable}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>SUBTOTAL</Text>
                <Text style={styles.totalsValue}>{formatMoney(subtotal)}</Text>
              </View>
              {hasDiscount ? (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>{discountLabel}</Text>
                  <Text style={[styles.totalsValue, { color: C.red }]}>−{formatMoney(discountAmount)}</Text>
                </View>
              ) : null}
              <View style={styles.totalsRowGrand}>
                <Text style={styles.totalsLabelGrand}>TOTAL DUE</Text>
                <Text style={styles.totalsValueGrand}>{formatMoney(total)}</Text>
              </View>
            </View>
          </View>

          {/* Payment */}
          {invoice.paymentInstructions ? (
            <View style={styles.notesPanel}>
              <Text style={styles.notesPanelLabel}>PAYMENT</Text>
              {invoice.paymentInstructions.split("\n").map((line, i) => (
                <Text key={`p${i}`} style={styles.notesPanelText}>{line}</Text>
              ))}
            </View>
          ) : null}

          {/* Signatures */}
          <View style={styles.signaturesRow}>
            {["Name / Title", "Customer Signature", "Date"].map((label) => (
              <View key={label} style={styles.signature}>
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLine} />
          <View style={styles.footerContent}>
            <Text style={styles.footerBrand}>
              {BUSINESS_DETAILS.name} · {BUSINESS_DETAILS.tagline}
            </Text>
            <Text style={styles.footerNote}>{invoice.invoiceNumber}</Text>
            <Text
              style={styles.footerPageNum}
              render={(args: unknown) => {
                const { pageNumber, totalPages } = args as { pageNumber: number; totalPages: number };
                return totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : "";
              }}
              fixed
            />
          </View>
        </View>
      </Page>
    </Document>
  );
}
