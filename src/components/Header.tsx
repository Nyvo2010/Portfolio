import type { MouseEvent } from "react";
import { goToSection } from "../utils/navigation";

const arrow = (
  <svg
    className="pill-arrow"
    aria-hidden="true"
    width="14"
    height="10"
    viewBox="0 0 14 10"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 5h11M8 1.5 11.5 5 8 8.5" />
  </svg>
);

const pills = [
  { label: "Works", href: "#works" },
  { label: "Writings", href: "#writings" },
  { label: "Contact", href: "#contact" },
];

export default function Header() {
  const onNav = (e: MouseEvent, href: string) => {
    // Plain left click → smooth-scroll; modifier/middle clicks fall
    // through to native anchor behavior (e.g. open in new tab).
    if (!goToSection(e, href)) return;
  };

  return (
    <header className="header-enter fixed top-0 inset-x-0 z-[60] bg-transparent">
      <div className="relative flex justify-center px-2 py-1.5">
        <nav className="flex flex-row items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => onNav(e, "#home")}
            className="header-logo px-1 py-1"
          >
            N.
          </button>
          {pills.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => onNav(e, l.href)}
              className="pill"
            >
              <span>{l.label}</span>
              {arrow}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
