"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#f5c14a", "#f3d28c", "#d4af37", "#e6e6e6", "#cfd7db"];
const PARTICLE_COUNT = 120;
const LINK_DISTANCE = 140;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  pulse: number;
  color: string;
};

function createParticles(width: number, height: number) {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.35 + Math.random() * 0.85;

    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.2 + Math.random() * 2.6,
      baseAlpha: 0.25 + Math.random() * 0.47,
      pulse: Math.random() * Math.PI * 2,
      color: COLORS[index % COLORS.length]
    };
  });
}

export function DotField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationFrame = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = createParticles(rect.width, rect.height);
    };

    const render = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      context.clearRect(0, 0, width, height);

      particles.forEach((particle, index) => {
        if (!reducedMotion) {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.pulse += 0.018;

          if (particle.x < -LINK_DISTANCE) particle.x = width + LINK_DISTANCE;
          if (particle.x > width + LINK_DISTANCE) particle.x = -LINK_DISTANCE;
          if (particle.y < -LINK_DISTANCE) particle.y = height + LINK_DISTANCE;
          if (particle.y > height + LINK_DISTANCE) particle.y = -LINK_DISTANCE;
        }

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const next = particles[nextIndex];
          const dx = particle.x - next.x;
          const dy = particle.y - next.y;
          const distance = Math.hypot(dx, dy);
          if (distance > LINK_DISTANCE) continue;

          const alpha = 0.32 * (1 - distance / LINK_DISTANCE);
          context.strokeStyle = `rgba(243, 210, 140, ${alpha})`;
          context.lineWidth = 1.4;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(next.x, next.y);
          context.stroke();
        }

        const alpha = particle.baseAlpha + Math.sin(particle.pulse) * 0.12;
        context.globalAlpha = Math.max(0.18, Math.min(0.72, alpha));
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
      });

      if (!reducedMotion) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    resize();
    render();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <div className={className} role="img" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
