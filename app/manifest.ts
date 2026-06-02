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
    icons: [
      { src: "/webby-sg-logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/webby-sg-logo.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/webby-sg-logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
