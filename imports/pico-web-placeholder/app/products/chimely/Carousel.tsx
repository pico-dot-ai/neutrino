"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import styles from "./Carousel.module.css";

type CarouselImage = {
  src: StaticImageData;
  alt: string;
};

type CarouselProps = {
  images: CarouselImage[];
};

const AUTOSCROLL_MS = 5200;
const TRANSITION_MS = 650;

export function Carousel({ images }: CarouselProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [stepSize, setStepSize] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [offset, setOffset] = useState(0);
  const [enableTransition, setEnableTransition] = useState(true);
  const [loopWidth, setLoopWidth] = useState(0);
  const [frameWidth, setFrameWidth] = useState<number | null>(null);

  const loopImages = useMemo(() => images.concat(images), [images]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const computeWidth = () => {
      const available = container.clientWidth || 0;
      if (!available) return;

      const slidesToShow = available >= 900 ? 4 : available >= 700 ? 3 : available >= 480 ? 2 : 1;
      const gap = 8;
      const usable = available - gap * (slidesToShow - 1);
      const target = Math.floor(usable / slidesToShow);
      const cap = slidesToShow === 1 ? Math.min(Math.round(available * 0.8), 220) : 220;
      const width = Math.max(150, Math.min(target, cap));
      setFrameWidth(width);
    };

    computeWidth();
    const observer = new ResizeObserver(computeWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
    const update = () => setReduceMotion(!!media?.matches);
    update();
    media?.addEventListener("change", update);
    return () => media?.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || track.children.length < 1) {
      return;
    }

    const measure = () => {
      if (track.children.length < 2) {
        const first = track.children[0] as HTMLElement;
        setStepSize(first?.getBoundingClientRect().width ?? 0);
        setLoopWidth(first?.getBoundingClientRect().width ?? 0);
        return;
      }
      const first = track.children[0] as HTMLElement;
      const second = track.children[1] as HTMLElement;
      const delta = second.offsetLeft - first.offsetLeft;
      const width = first.getBoundingClientRect().width;
      const size = delta > 0 ? delta : width;
      setStepSize(size);
      setLoopWidth(size * images.length);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    Array.from(track.children).forEach((child) => observer.observe(child as Element));

    return () => observer.disconnect();
  }, [loopImages]);

  useEffect(() => {
    if (!stepSize || reduceMotion) {
      return;
    }

    const tick = () => {
      setOffset((current) => {
        const next = current + stepSize;
        if (loopWidth && next >= loopWidth) {
          // let the current transition finish, then snap back without transition
          setTimeout(() => {
            setEnableTransition(false);
            setOffset(next - loopWidth);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => setEnableTransition(true));
            });
          }, TRANSITION_MS);
        }
        return next;
      });
    };

    const id = setInterval(tick, AUTOSCROLL_MS);
    return () => clearInterval(id);
  }, [stepSize, reduceMotion, loopWidth]);

  const frameWidthStyle = frameWidth
    ? ({ "--frame-width": `${frameWidth}px` } as CSSProperties)
    : undefined;

  return (
    <div ref={containerRef} className={styles.carousel} style={frameWidthStyle}>
      <div
        ref={trackRef}
        className={styles.track}
        style={{
          transform: `translateX(-${offset}px)`,
          transition: enableTransition && !reduceMotion ? `transform ${TRANSITION_MS}ms ease` : "none"
        }}
      >
        {loopImages.map((image, index) => (
          <figure key={`${image.alt}-${index}`} className={styles.frame}>
            <Image src={image.src} alt={image.alt} className={styles.screenshot} />
          </figure>
        ))}
      </div>
    </div>
  );
}
