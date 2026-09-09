import { writings, writingSlug } from "../content/content";
import { siteUrl } from "../utils/urls";
import { transitionToLink } from "../utils/navigation";

/* Writings — full-bleed index. Large titles, plain meta, nothing else. */
export default function Writings() {
  return (
    <section id="writings" className="relative z-10 scroll-mt-20 px-6 pt-56 pb-24 text-black">
      <h2 className="t-heading text-balance">Writings</h2>
      <ul className="mt-12 w-full border-b border-black/10">
        {writings.map((writing) => (
          <li key={writing.id} className="border-t border-black/10">
            <a
              href={siteUrl(`/writings/${writingSlug(writing)}`)}
              onClick={(e) => transitionToLink(e)}
              className="group flex w-full flex-col gap-1 py-4 text-left sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <span className="t-post transition-transform duration-300 ease-out group-hover:translate-x-2">
                {writing.title}
              </span>
              <span className="t-body w-20 shrink-0 text-left opacity-40 sm:text-right">{writing.date}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
