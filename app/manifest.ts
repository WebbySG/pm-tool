import type { MetadataRoute } from "next";

// Web App Manifest — makes the app installable on Android ("Install app" / Add to
// Home screen) and runs it standalone (own window, app icon, no browser chrome).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Webby SG OS",
    short_name: "Webby OS",
    description: "Internal project management for Webby SG — projects, tasks, chat & invoices.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a1828",
    theme_color: "#0a1828",
    // `sizes: "any"` avoids the "Resource size is not correct" warning while the
    // logo isn't exported at exact 192/512. Replace with purpose-built icons later.
    icons: [
      { src: "/webby-sg-logo.png", sizes: "any", type: "image/png", purpose: "any" },
    ],
  };
}
