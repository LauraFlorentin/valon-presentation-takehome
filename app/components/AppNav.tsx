"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav">
      <Link href="/" className={pathname === "/" ? "active" : ""}>
        Library
      </Link>
      <Link href="/evals" className={pathname === "/evals" ? "active" : ""}>
        Evals
      </Link>
      <Link href="/new" className="button-gold button-small">
        New presentation
      </Link>
    </nav>
  );
}
