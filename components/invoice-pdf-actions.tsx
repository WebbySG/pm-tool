"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Download, Eye, Loader2 } from "lucide-react";
import type { Invoice } from "@/lib/invoice-types";
import { InvoiceDocument } from "@/components/invoice-pdf";

// React-PDF can't be SSR'd — load the client-only renderer dynamically.
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false, loading: () => (
    <span className="flex items-center gap-1.5 text-xs font-semibold opacity-60">
      <Loader2 size={12} className="animate-spin" /> Loading…
    </span>
  ) },
);

interface Props {
  invoice: Invoice;
}

export function InvoicePdfActions({ invoice }: Props) {
  const [previewing, setPreviewing] = useState(false);

  async function handlePreview() {
    setPreviewing(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<InvoiceDocument invoice={invoice} />).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      // Revoke after a delay so the new tab has time to load
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } finally {
      setPreviewing(false);
    }
  }

  const fileName = `${invoice.invoiceNumber}_${invoice.billToName.replace(/[^a-zA-Z0-9]+/g, "_")}.pdf`;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePreview}
        disabled={previewing}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
        style={{ background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
      >
        {previewing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
        Preview PDF
      </button>

      <PDFDownloadLink
        document={<InvoiceDocument invoice={invoice} />}
        fileName={fileName}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
        style={{ background: "var(--accent)20", color: "var(--accent)" }}
      >
        {({ loading }) => (
          <>
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            Download PDF
          </>
        )}
      </PDFDownloadLink>
    </div>
  );
}
