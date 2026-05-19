import Image from "next/image";
import type { Metadata } from "next";

import { Carousel } from "./Carousel";
import image1 from "./image1.png";
import image2 from "./image2.png";
import image3 from "./image3.png";
import image4 from "./image4.png";
import image5 from "./image5.png";
import chimelyIcon from "./chimely-icon.svg";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Chimely | pico.ai",
  description:
    "Chimely is a beautifully simple countdown timer designed to keep you focused, on schedule, and in control of your time.",
  robots: { index: false, follow: false }
};

const screenshots = [
  { src: image1, alt: "Chimely countdown timer screen 1" },
  { src: image2, alt: "Chimely countdown timer screen 2" },
  { src: image3, alt: "Chimely countdown timer screen 3" },
  { src: image4, alt: "Chimely countdown timer screen 4" },
  { src: image5, alt: "Chimely countdown timer screen 5" }
];

export default function ChimelyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>iOS app | Countdown timer</p>
        <div className={styles.titleRow}>
          <Image src={chimelyIcon} alt="Chimely icon" className={styles.icon} />
          <h1 className={styles.title}>Chimely</h1>
        </div>
        <p className={styles.lede}>
          Chimely is a beautifully simple countdown timer designed to keep you
          focused, on schedule, and in control of your time. Whether you&apos;re
          timing a routine, a deep work block, or a daily habit, Chimely makes
          staying on track effortless.
        </p>
        <p className={styles.sublede}>
          Use one-tap timers, schedule a timer to end at a specific time, and
          choose chimes that match your mood or workflow. Live progress updates
          appear instantly in the Dynamic Island and Lock Screen, so you never
          lose focus.
        </p>
      </header>

      <div className={styles.carouselWrap}>
        <Carousel images={screenshots} />
      </div>

      <section className={styles.gridTwo}>
        <div className={styles.panel}>
          <div className={styles.cardTitle}>Features</div>
          <ul className={styles.featureList}>
            <li>
              <h3>Clean, intuitive timers</h3>
              <p>
                Start a timer instantly or set one to end at an exact time -
                perfect for cooking, workouts, or routines.
              </p>
            </li>
            <li>
              <h3>Custom chime styles</h3>
              <p>
                Choose the sound that fits your flow. From soft tones to more
                attention-grabbing alerts, tailor each chime to how you like to
                work.
              </p>
            </li>
            <li>
              <h3>Dual Progress rings</h3>
              <p>
                Keep track of intervals and overall time at a glance with
                smooth, minimal progress rings designed for clarity and calm.
              </p>
            </li>
            <li>
              <h3>Dynamic Island + Lock Screen support</h3>
              <p>
                Your timer remains visible even when your phone is locked or
                you&apos;re using other apps.
              </p>
            </li>
            <li>
              <h3>Lightweight and distraction-free</h3>
              <p>
                Chimely is designed to stay out of your way - one screen, no
                accounts, no clutter.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionDot} />
          <span>FAQ</span>
        </div>
        <div className={styles.faqList}>
          <div className={styles.faqItem}>
            <h4>Which devices does Chimely support?</h4>
            <p className={styles.muted}>Any iPhone running iOS 17 or later.</p>
          </div>
          <div className={styles.faqItem}>
            <h4>What happens in silent mode?</h4>
            <p className={styles.muted}>
              When your device is in silent mode, Chimely can only deliver notifications.
            </p>
          </div>
          <div className={styles.faqItem}>
            <h4>Will I get alerts on Apple Watch?</h4>
            <p className={styles.muted}>
              If you mirror notifications for Chimely to Apple Watch, you&apos;ll receive them on your watch.
            </p>
          </div>
        </div>
      </section>

      <div className={styles.ctaRow}>
        <a
          href="https://apps.apple.com/us/app/chimely-mindfulness-timer/id6754782048?itscg=30200&itsct=apps_box_badge&mttnsubad=6754782048"
          className={styles.appStoreBadge}
        >
          <img
            src="https://toolbox.marketingtools.apple.com/api/v2/badges/download-on-the-app-store/black/en-us?releaseDate=1765152000"
            alt="Download on the App Store"
            className={styles.appStoreImage}
          />
        </a>
        <p className={styles.muted}>
          <a className={styles.inlineLink} href="/products/chimely/privacy">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
