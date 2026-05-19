import Image from "next/image";
import { DotField } from "../components/DotField";
import { FeedbackForm } from "../components/FeedbackForm";

export default function HomePage() {
  return (
    <main className="page-shell">
      <DotField />
      <div className="pico-content">
        <Image
          src="/pico-logo.svg"
          alt="pico.ai"
          width={360}
          height={96}
          priority
        />
        <p className="pico-tagline">
          There&apos;s an AI for everyone.
        </p>
        <p className="feedback-intro">
          We&apos;re building something new. Share your email so we can stay in touch, we&apos;d love to keep you close on the journey.
        </p>
        <FeedbackForm />
      </div>
    </main>
  );
}
