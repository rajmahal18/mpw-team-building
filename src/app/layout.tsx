import "./globals.css";
import Link from "next/link";
import { PwaBootstrap } from "@/features/participant/PwaBootstrap";

export const metadata = {
  title: { default: "MPW Team Building", template: "%s · MPW Team Building" },
  description: "Configurable MPW team-building event operations platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header">
      <Link className="brand-lockup" href="/" aria-label="MPW Team Building home">
        <span className="brand-mark" aria-hidden="true">MPW</span>
        <span><strong>Team Building</strong><small>Event operations</small></span>
      </Link>
      <nav className="site-nav" aria-label="Primary">
        <Link href="/admin">Organizer</Link>
      </nav>
    </header>
    <PwaBootstrap/>
    <div id="main-content">{children}</div>
  </body></html>;
}
