import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { FrostedHeader } from "@/components/design/frosted-header";
import styles from "./login.module.css";

export default async function LoginPage(props: {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
}) {
  const searchParams = await props.searchParams;

  return (
    <main className={styles.shell}>
      <FrostedHeader
        brand={{
          href: "/",
          ariaLabel: "Go to picoAI home",
          logoSrc: "/favicon.svg",
          logoWidth: 28,
          logoHeight: 28,
          title: "picoAI"
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
        <Link href="/" className={styles.navCta}>
          Back to Main
        </Link>
      </FrostedHeader>
      <LoginForm
        initialError={
          searchParams.error === "forbidden"
            ? "Your account is authenticated but does not meet app admin eligibility requirements."
            : undefined
        }
        nextPath={searchParams.next}
      />
    </main>
  );
}
