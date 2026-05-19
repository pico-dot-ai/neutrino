import type { Metadata } from "next";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Chimely Privacy Policy | pico.ai",
  description:
    "Privacy policy for Chimely. We collect only anonymous usage and crash data via Google Analytics to improve the app.",
  robots: { index: false, follow: false }
};

export default function ChimelyPrivacyPage() {
  return (
    <main className={`page-shell privacy-page ${styles.shell}`}>
      <div className={styles.content}>
        <a className={styles.backLink} href="/products/chimely">
          ← Back to Chimely
        </a>
        <h1 className={styles.title}>Chimely Privacy Policy</h1>
        <p className={styles.intro}>
          <strong>Last Updated:</strong> 2025-12-07
        </p>
        <p className={styles.intro}>
          Chimely (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we handle information when you use the Chimely mobile application (&quot;App&quot;). Chimely is designed to operate with minimal data collection, and we do not collect, store, or sell personal information. By using Chimely, you agree to the practices described in this Privacy Policy.
        </p>

        <section className={styles.section}>
          <h2>1. Information We Collect</h2>
          <h3>1.1 Personal Data</h3>
          <p>Chimely does not collect, store, or process any personal data such as your name, email address, phone number, or location.</p>

          <h3>1.2 Usage Data (Anonymous)</h3>
          <p>The App may collect anonymous, non-personally identifiable usage information to help us understand performance and improve functionality. This may include:</p>
          <ul>
            <li>App feature usage patterns</li>
            <li>Anonymous event counts (e.g., timers started)</li>
            <li>Device type and OS version (non-identifying)</li>
          </ul>
          <p>This information cannot be used to identify you, and we do not combine it with any personal data.</p>

          <h3>1.3 No Tracking, No Advertising</h3>
          <ul>
            <li>We do not use any advertising frameworks.</li>
            <li>We do not track users across apps or websites.</li>
            <li>We do not sell or share user data with third parties for marketing or profiling.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>2. How We Use Information</h2>
          <p>Anonymous usage data may be used to:</p>
          <ul>
            <li>Improve app stability and performance</li>
            <li>Understand which features are most useful</li>
            <li>Guide future development</li>
          </ul>
          <p>We do not use any data for marketing, profiling, or advertising.</p>
        </section>

        <section className={styles.section}>
          <h2>3. Legal Basis for Processing (UK & EU GDPR)</h2>
          <p>
            For users in the UK and EU, our legal basis for processing anonymous data is legitimate interest - understanding app performance and ensuring a reliable user experience. Since no personal data is collected, most GDPR provisions regarding personal data do not apply.
          </p>
        </section>

        <section className={styles.section}>
          <h2>4. Your Rights</h2>
          <h3>4.1 EU/UK GDPR Rights</h3>
          <p>Users in the EU and UK may request:</p>
          <ul>
            <li>Confirmation of whether any personal data is collected (we collect none)</li>
            <li>Deletion of any personal data (none is stored)</li>
            <li>Restriction or objection to processing (only anonymous data exists)</li>
          </ul>

          <h3>4.2 California Privacy Rights (CCPA/CPRA)</h3>
          <p>California users have the right to:</p>
          <ul>
            <li>Know what personal data is collected (none)</li>
            <li>Request deletion of personal data (none exists)</li>
            <li>Opt out of sale or sharing of personal data (we do not sell or share any data)</li>
          </ul>
          <p>Chimely qualifies as a &quot;No Data Collection&quot; application under CCPA/CPRA.</p>
        </section>

        <section className={styles.section}>
          <h2>5. Data Retention</h2>
          <p>We do not retain or store personal data. Anonymous aggregate analytics data may be retained for internal performance measurement.</p>
        </section>

        <section className={styles.section}>
          <h2>6. Children&apos;s Privacy</h2>
          <p>
            Chimely does not collect any personal data and does not include content inappropriate for children. However, the App is not specifically targeted toward children under 13. Because no personal information is collected, Chimely complies with COPPA and similar child protection regulations.
          </p>
        </section>

        <section className={styles.section}>
          <h2>7. Data Security</h2>
          <p>Because we do not store personal information, risks are minimized. Anonymous analytics data is handled securely using industry-standard protections.</p>
        </section>

        <section className={styles.section}>
          <h2>8. International Data Transfers</h2>
          <p>Chimely does not transfer or store personal data. Anonymous usage analytics may be processed by trusted third-party services that comply with GDPR, UK GDPR, and CCPA.</p>
        </section>

        <section className={styles.section}>
          <h2>9. Third-Party Services</h2>
          <p>
            If the App uses analytics tools (e.g., basic usage metrics), they may process anonymous data. These services do not receive any personal data from Chimely. We do not use advertising SDKs, social login providers, or third-party tracking tools.
          </p>
        </section>

        <section className={styles.section}>
          <h2>10. Changes to This Privacy Policy</h2>
          <p>We may update this Privacy Policy occasionally. The &quot;Last Updated&quot; date at the top will reflect changes. Continued use of the App after changes indicates acceptance.</p>
        </section>

        <section className={styles.section}>
          <h2>11. Contact Us</h2>
          <p className={styles.contact}>
            If you have questions about this Privacy Policy or your data rights, you may contact us at:
            <br />
            <strong>Email:</strong> <a href="mailto:chimely-app@pico.ai">chimely-app@pico.ai</a>
            <br />
            <strong>Website:</strong> <a href="https://pico.ai">https://pico.ai</a>
          </p>
        </section>
      </div>
    </main>
  );
}
