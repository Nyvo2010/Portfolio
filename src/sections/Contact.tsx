const links = [
  { label: "Email", href: "mailto:niekyuwen@gmail.com" },
  { label: "Github", href: "https://github.com/Nyvo2010" },
  { label: "Linkedin", href: "https://www.linkedin.com/in/niek-vogelaar" },
];

/* Contact — closing scene. Heading + plain contact links, nothing else. */
export default function Contact() {
  return (
    <section
      id="contact"
      data-reveal
      className="relative z-10 flex min-h-[100dvh] scroll-mt-20 flex-col items-center justify-center px-6 text-center text-black"
    >
      <h2 className="t-heading text-balance">Get in touch</h2>
      <div className="mt-12 flex flex-wrap items-center justify-center gap-x-12 gap-y-3">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target={l.href.startsWith("http") ? "_blank" : undefined}
            rel={l.href.startsWith("http") ? "noreferrer" : undefined}
            className="t-body contact-link"
          >
            {l.label}
          </a>
        ))}
      </div>
    </section>
  );
}
