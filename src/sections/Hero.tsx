export default function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 text-black"
    >
      {/* text layer — sits behind the fixed blob */}
      <div className="pointer-events-none relative z-0 px-4 text-center">
        <h1 className="t-heading text-balance">
          <span className="hero-mask block">
            <span className="hero-line block" style={{ animationDelay: "0.05s" }}>
              Exploring the limits
            </span>
          </span>
          <span className="hero-mask block">
            <span className="hero-line block" style={{ animationDelay: "0.18s" }}>
              of ML and design
            </span>
          </span>
        </h1>

        <p
          className="t-body hero-fade mx-auto mt-6 max-w-md opacity-70 md:mt-8"
          style={{ animationDelay: "0.75s" }}
        >
          Nyvo — creative engineer working between machine learning and design
          for the web.
        </p>
      </div>
    </section>
  );
}
