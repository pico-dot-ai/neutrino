"use client";

import { useEffect, useId, useRef } from "react";

const VORTEX_CONFIG = {
  particles: {
    number: {
      value: 120,
      density: {
        enable: true,
        value_area: 800
      }
    },
    color: {
      value: ["#f5c14a", "#f3d28c", "#d4af37", "#e6e6e6", "#cfd7db"]
    },
    shape: {
      type: "circle",
      stroke: {
        width: 0,
        color: "#d4af37"
      },
      polygon: {
        nb_sides: 5
      },
      image: {
        src: "",
        width: 0,
        height: 0
      }
    },
    opacity: {
      value: 0.72,
      random: true,
      anim: {
        enable: true,
        speed: 0.6,
        opacity_min: 0.25,
        sync: false
      }
    },
    size: {
      value: 4.8,
      random: true,
      anim: {
        enable: true,
        speed: 4,
        size_min: 2.2,
        sync: false
      }
    },
    line_linked: {
      enable: true,
      distance: 140,
      color: "#f3d28c",
      opacity: 0.32,
      width: 1.4
    },
    move: {
      enable: true,
      speed: 5,
      direction: "none",
      random: false,
      straight: false,
      out_mode: "out",
      bounce: false,
      attract: {
        enable: true,
        rotateX: 600,
        rotateY: 1200
      }
    }
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: {
        enable: false,
        mode: "repulse"
      },
      onclick: {
        enable: false,
        mode: "push"
      },
      resize: true
    },
    modes: {
      grab: {
        distance: 400,
        line_linked: {
          opacity: 1
        }
      },
      bubble: {
        distance: 400,
        size: 40,
        duration: 2,
        opacity: 8,
        speed: 3
      },
      repulse: {
        distance: 70
      },
      push: {
        particles_nb: 4
      },
      remove: {
        particles_nb: 2
      }
    }
  },
  retina_detect: true
};

const PARTICLES_SCRIPT_ID = "pico-particles-script";
const PARTICLES_SCRIPT_SRC =
  "https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js";

let particlesLibraryPromise: Promise<void> | null = null;

function ensureParticlesLibrary(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.particlesJS) {
    return Promise.resolve();
  }

  if (particlesLibraryPromise) {
    return particlesLibraryPromise;
  }

  particlesLibraryPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(
      PARTICLES_SCRIPT_ID
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load particles.js script.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = PARTICLES_SCRIPT_ID;
    script.src = PARTICLES_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load particles.js script."));
    document.body.appendChild(script);
  }).catch((error) => {
    particlesLibraryPromise = null;
    throw error;
  });

  return particlesLibraryPromise;
}

export function DotField() {
  const reactId = useId();
  const containerId = `pico-particles-${reactId.replace(/:/g, "-")}`;
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadParticles = async () => {
      try {
        await ensureParticlesLibrary();
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error(error);
        }
        return;
      }

      if (cancelled || typeof window === "undefined") {
        return;
      }

      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => resolve());
        } else {
          resolve();
        }
      });

      if (!document.getElementById(containerId)) {
        return;
      }

      const existingInstances = Array.isArray(window.pJSDom) ? window.pJSDom : [];
      existingInstances.forEach((instance) => {
        try {
          instance.fn.vendors.destroypJS();
        } catch {
          // ignore cleanup errors
        }
      });

      if (!Array.isArray(window.pJSDom)) {
        window.pJSDom = [];
      }

      if (window.particlesJS) {
        window.particlesJS(containerId, VORTEX_CONFIG);
      }

      cleanupRef.current = () => {
        const dom = Array.isArray(window.pJSDom) ? window.pJSDom : [];
        dom.forEach((instance) => {
          try {
            instance.fn.vendors.destroypJS();
          } catch {
            // ignore cleanup errors
          }
        });
        window.pJSDom = [];
      };
    };

    loadParticles();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
    };
  }, [containerId]);

  return <div id={containerId} className="landing-dot-field" role="img" aria-hidden="true" />;
}
