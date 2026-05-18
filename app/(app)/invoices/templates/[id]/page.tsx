"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { InvoiceTemplateForm } from "@/components/invoice-template-form";
import { loadInvoiceTemplate } from "@/lib/invoice-db";
import type { InvoiceTemplate } from "@/lib/invoice-types";
import { Loader2 } from "lucide-react";

export default function EditInvoiceTemplatePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [tpl, setTpl] = useState<InvoiceTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadInvoiceTemplate(id).then((t) => {
      if (!t) setNotFound(true);
      else setTpl(t);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  return (
    <AdminOnly>
      <Topbar title={tpl ? `Edit · ${tpl.name}` : "Edit Template"} back={{ label: "Templates", href: "/invoices/templates" }} />
      <div className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : notFound ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Template not found.</p>
        ) : tpl ? (
          <InvoiceTemplateForm existing={tpl} />
        ) : null}
      </div>
    </AdminOnly>
  );
}
