import { useEffect, useLayoutEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "../components/Header";
import { writings, writingSlug, type Writing } from "../content/content";
import Contact from "./Contact";
import { assetUrl } from "../utils/urls";
import { waitForFonts } from "../utils/ready";
import { initReveals } from "../utils/reveal";

export default function WritingPage({ writing }: { writing: Writing }) {
  const [ready, setReady] = useState(false);

  // No loading screen here — the page simply fades in once the display
  // face is ready, so there is never a weight flash. Cached visits resolve
  // in milliseconds. The fallback caps a cold visit at 2.5s instead of
  // the 4s font timeout — text in the fallback face beats a blank page.
  useEffect(() => {
    let on = true;
    const fallback = window.setTimeout(() => {
      if (on) setReady(true);
    }, 2500);
    void Promise.allSettled([waitForFonts()]).then(() => {
      if (on) setReady(true);
    });
    return () => {
      on = false;
      window.clearTimeout(fallback);
    };
  }, [writing]);

  // Same one-shot reveal pass as the home page — the Contact scene at the
  // end of the article settles in as it enters instead of just sitting there.
  useLayoutEffect(() => {
    initReveals();
  }, []);

  return (
    <div
      className={`min-h-[100dvh] bg-white text-black transition-opacity duration-300 ${
        ready ? "app-ready opacity-100" : "opacity-0"
      }`}
    >
      <Header />
      {/* the rise lives on <main>, never the root — a transform on the
          root would turn the fixed header into a relative one */}
      <main
        className={`px-6 pt-[22vh] pb-12 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-10 md:px-16 ${
          ready ? "translate-y-0" : "translate-y-3"
        }`}
      >
        <header className="mx-auto flex min-h-[38vh] max-w-4xl flex-col items-center justify-center text-center">
          <h1 className="writing-title t-heading text-balance">{writing.title}</h1>
          <p className="t-body mt-5 opacity-40">{writing.date}</p>
        </header>

        <article className="writing-body mx-auto max-w-2xl">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h2 className="t-heading mb-8 mt-20 text-balance">{children}</h2>,
              h2: ({ children }) => <h2 className="t-heading mb-8 mt-20 text-balance">{children}</h2>,
              h3: ({ children }) => <h3 className="t-post mb-5 mt-14">{children}</h3>,
              p: ({ children }) => <p className="t-body mb-7 max-w-2xl opacity-70">{children}</p>,
              ul: ({ children }) => <ul className="t-body mb-8 list-disc space-y-2 pl-6 opacity-70">{children}</ul>,
              ol: ({ children }) => <ol className="t-body mb-8 list-decimal space-y-2 pl-6 opacity-70">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              blockquote: ({ children }) => <blockquote className="t-body mb-8 border-l border-black/20 pl-5 italic opacity-70">{children}</blockquote>,
              hr: () => <hr className="my-12 border-black/10" />,
              a: ({ href, children }) => (
                <a className="underline decoration-black/20 transition-opacity hover:opacity-50" href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              ),
              img: ({ src, alt }) => (
                <img className="my-10 block h-auto w-full object-contain" src={src ? assetUrl(src) : undefined} alt={alt ?? ""} loading="lazy" decoding="async" />
              ),
              code: ({ children }) => <code className="rounded bg-black/5 px-1 py-0.5">{children}</code>,
              // Fenced blocks keep their whitespace + scroll sideways instead
              // of wrapping (inline `code` above stays for backtick spans).
              pre: ({ children }) => <pre className="t-body mb-8 overflow-x-auto rounded bg-black/5 p-4">{children}</pre>,
            }}
          >
            {writing.body}
          </ReactMarkdown>
        </article>
      </main>
      <Contact />
    </div>
  );
}

export function findWriting(slug: string) {
  return writings.find((writing) => writingSlug(writing) === slug) ?? null;
}
