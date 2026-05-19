import Image from "next/image";
import Link from "next/link";
import { FrostedHeader } from "@/components/design/frosted-header";
import { DotField } from "@/components/landing/dot-field";
import { FeedbackForm } from "@/components/landing/feedback-form";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.shell}>
      <FrostedHeader
        brand={{
          href: "/",
          ariaLabel: "Go to pico.ai home",
          logoSrc: "/favicon.svg",
          logoWidth: 28,
          logoHeight: 28,
          title: "pico.ai",
          subtitle: "There's an AI for everyone"
        }}
        classNames={{
          header: styles.header,
          inner: styles.headerInner,
          brand: styles.brand,
          brandMark: styles.brandMark,
          brandLogo: styles.brandLogo,
          brandCopy: styles.brandCopy,
          brandTitle: styles.brandTitle,
          brandSubtitle: styles.brandSubtitle,
          nav: styles.nav
        }}
      >
        <Link href="/login" className={styles.navCta}>
          Login
        </Link>
      </FrostedHeader>

      <DotField className={styles.dotField} />

      <section className={styles.content}>
        <Image src="/pico-logo.svg" alt="pico.ai" width={360} height={96} priority />
        <p className={styles.tagline}>There&apos;s an AI for everyone.</p>
        <p className={styles.intro}>
          We&apos;re building something new. Share your email so we can stay in touch,
          we&apos;d love to keep you close on the journey.
        </p>
        <FeedbackForm
          classNames={{
            form: styles.feedbackForm,
            inputWrap: styles.feedbackInput,
            status: styles.feedbackStatus,
            statusVisible: styles.feedbackStatusVisible,
            submit: styles.feedbackSubmit,
            submitActive: styles.feedbackSubmitActive,
            submitInactive: styles.feedbackSubmitInactive
          }}
        />
      </section>
    </main>
  );
}
