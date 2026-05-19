import type { Metadata } from "next";
import type { ReactNode } from "react";

import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "Products | pico.ai",
  description: "Explore pico.ai products, including Chimely and what comes next.",
  robots: { index: false, follow: false }
};

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.productsShell}>
      <div className={styles.productsContent}>{children}</div>
    </div>
  );
}
