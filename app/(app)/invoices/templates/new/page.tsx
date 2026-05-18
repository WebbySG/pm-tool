"use client";
import { Topbar } from "@/components/topbar";
import { AdminOnly } from "@/components/admin-guard";
import { InvoiceTemplateForm } from "@/components/invoice-template-form";

export default function NewInvoiceTemplatePage() {
  return (
    <AdminOnly>
      <Topbar title="New Template" back={{ label: "Templates", href: "/invoices/templates" }} />
      <div className="p-6">
        <InvoiceTemplateForm />
      </div>
    </AdminOnly>
  );
}
