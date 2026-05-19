import Image from "next/image";
import Link from "next/link";
import { DotField } from "@/components/landing/dot-field";
import { FeedbackForm } from "@/components/landing/feedback-form";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <header className="landing-header" role="banner">
        <div className="landing-header-inner">
          <div className="landing-brand">
            <Link
              className="landing-brand-mark"
              href="/"
              aria-label="Go to pico.ai home"
            >
              <Image
                src="/favicon.svg"
                alt=""
                className="landing-brand-mark-img"
                width={28}
                height={28}
              />
            </Link>
            <div className="landing-brand-copy">
              <div className="landing-brand-name">pico.ai</div>
              <div className="landing-brand-tagline">There&apos;s an AI for everyone.</div>
            </div>
          </div>
          <nav className="landing-nav" aria-label="Primary">
            <Link href="/login" className="landing-nav-cta">
              Login
            </Link>
          </nav>
        </div>
      </header>

      <DotField />

      <section className="landing-content">
        <Image src="/pico-logo.svg" alt="pico.ai" width={360} height={96} priority />
        <p className="landing-tagline">There&apos;s an AI for everyone.</p>
        <p className="landing-intro">
          We&apos;re building something new. Share your email so we can stay in touch,
          we&apos;d love to keep you close on the journey.
        </p>
        <FeedbackForm />
      </section>
    </main>
  );
}
