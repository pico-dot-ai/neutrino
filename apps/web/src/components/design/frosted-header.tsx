import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type FrostedHeaderClassNames = {
  header: string;
  inner: string;
  brand: string;
  brandMark: string;
  brandLogo: string;
  brandCopy: string;
  brandTitle: string;
  brandSubtitle: string;
  nav: string;
};

type FrostedHeaderBrand = {
  href: string;
  ariaLabel: string;
  logoSrc: string;
  logoAlt?: string;
  logoWidth: number;
  logoHeight: number;
  title: string;
  subtitle?: string;
};

export function FrostedHeader({
  brand,
  children,
  classNames,
  navLabel = "Primary"
}: {
  brand: FrostedHeaderBrand;
  children?: ReactNode;
  classNames: FrostedHeaderClassNames;
  navLabel?: string;
}) {
  return (
    <header className={classNames.header} role="banner">
      <div className={classNames.inner}>
        <div className={classNames.brand}>
          <Link
            className={classNames.brandMark}
            href={brand.href}
            aria-label={brand.ariaLabel}
          >
            <Image
              src={brand.logoSrc}
              alt={brand.logoAlt ?? ""}
              className={classNames.brandLogo}
              width={brand.logoWidth}
              height={brand.logoHeight}
            />
          </Link>
          <div className={classNames.brandCopy}>
            <div className={classNames.brandTitle}>{brand.title}</div>
            {brand.subtitle ? (
              <div className={classNames.brandSubtitle}>{brand.subtitle}</div>
            ) : null}
          </div>
        </div>

        {children ? (
          <nav className={classNames.nav} aria-label={navLabel}>
            {children}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
