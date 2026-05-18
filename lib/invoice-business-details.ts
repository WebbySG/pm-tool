// Single source of truth for the "From" details on every invoice PDF.
// Update this file when business details change — it's used by the React-PDF template.

export const BUSINESS_DETAILS = {
  name: "Webby SG",
  tagline: "Bringing business online",
  contactPerson: "Leon",
  contactPhone: "80805608",
  uen: "202444139M",
  // kept for backwards compat — derived from contactPerson + contactPhone
  contact: "80805608 (Leon)",
  addressLines: [
    "60 Paya Lebar Road",
    "#07-54 Paya Lebar Square",
    "Singapore 409051",
  ],
  // Logo source — can be a /public path or a full external URL.
  // Set to null to render the brand as text-only.
  logoPath: "/webby-sg-logo.png" as string | null,
  // Payment UEN (shown as the "Pay now to UEN" line in footer)
  paymentUEN: "202444139M",
} as const;
