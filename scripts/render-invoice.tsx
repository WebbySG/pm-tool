// One-off PDF render harness — renders the REAL <InvoiceDocument> to a file so we can
// eyeball the production output without a browser. Run with: npx tsx scripts/render-invoice.tsx
import fs from "node:fs";
import path from "node:path";
import React from "react";
import ReactPDF from "@react-pdf/renderer";
import { InvoiceDocument } from "../components/invoice-pdf";
import type { Invoice } from "../lib/invoice-types";

const root = path.resolve(__dirname, "..");
const logoPath = path.join(root, "public", "webby-sg-logo.png");
const logoData = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");

// Mirrors pm_invoices row WSG-2026-06-16-2 exactly (fetched from Supabase).
const invoice = {
  id: "cd098b01-40b8-4315-8e36-49efbbf64412",
  invoiceNumber: "WSG-2026-06-16-2",
  clientId: null,
  projectId: null,
  templateId: null,
  docType: "invoice",
  convertedToInvoiceId: null,
  convertedFromQuoteId: null,
  status: "draft",
  currency: "SGD",
  issueDate: "2026-06-16",
  dueDate: "2026-06-30",
  billToName: "Naomé",
  billToAttention: "",
  billToEmail: "",
  billToAddress: "",
  notes: "Thank you for choosing Webby SG to build your Shopify store. We're excited to bring your business online.",
  paymentInstructions: "Note: Payment for fund transfer to;\nPay now to UEN 202444139M",
  subtotal: 1200,
  discountType: "none",
  discountValue: 0,
  total: 1200,
  reminderCadenceDays: [],
  lastReminderSentAt: null,
  sentAt: null,
  sentToEmail: null,
  pdfPath: null,
  paidAt: null,
  paidBy: null,
  paidNote: null,
  createdBy: null,
  createdAt: "2026-06-16T00:00:00Z",
  updatedAt: "2026-06-16T00:00:00Z",
  lineItems: [
    {
      id: "li-1",
      invoiceId: "cd098b01-40b8-4315-8e36-49efbbf64412",
      description:
        "Shopify Website Development (5–7 pages)\n\n" +
        "  • Platform: Shopify\n" +
        "  • Ecommerce / Online Store Setup\n" +
        "  • Product & Collection Setup\n" +
        "  • Responsive Theme Design (Desktop and Mobile Optimised)\n" +
        "  • Payment Gateway Integration\n" +
        "  • Social Media Integration\n" +
        "  • WhatsApp Integration\n\n" +
        "Professional Services\n" +
        "  • One year Maintenance and Content Guide Support\n" +
        "  • Essential Apps & Plugins Integration\n" +
        "  • SEO-ready setup (make store searchable in Google)\n\n" +
        "Note: Shopify platform subscription and domain are billed separately by Shopify.",
      qty: 1,
      unitPrice: 1200,
      lineTotal: 1200,
      sortOrder: 0,
    },
  ],
  payments: [],
} as Invoice;

const outPath = path.join(root, "WSG-2026-06-16-2.pdf");

async function main() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(InvoiceDocument, { invoice, logoUrl: logoData }) as any;
  await ReactPDF.renderToFile(element, outPath);
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
