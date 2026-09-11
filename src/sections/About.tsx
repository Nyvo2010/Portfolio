import { assetUrl } from "../utils/urls";

/* About — heading with body text below it on the left,
   portrait on the right. Nothing else. */
export default function About() {
  return (
    <section
      id="about"
      className="relative z-10 flex min-h-[52dvh] scroll-mt-20 items-center px-6 pt-12 pb-2 text-black"
    >
      <div className="grid w-full items-center gap-10 md:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-col gap-6">
          <h2 className="t-heading text-balance">Hey, I&rsquo;m Nyvo</h2>

          <p className="t-body max-w-md opacity-70">
            I&rsquo;m a creative and curious person who enjoys exploring
            what&rsquo;s possible with technology. I like using creativity
            both to solve problems and in graphic design, combining technical
            thinking for building software that feels refined. Currently
            exploring the ML space while also being in highschool.
          </p>
        </div>

        {/* center lane — reserved for the fixed blob */}
        <div aria-hidden className="blob-lane hidden shrink-0 md:block" />

        <img
          src={assetUrl("/PFP-630.webp")}
          alt="Portrait of Nyvo"
          width={630}
          height={840}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="aspect-[3/4] w-full max-w-[280px] object-cover md:max-w-[320px] md:justify-self-end"
        />
      </div>
    </section>
  );
}
