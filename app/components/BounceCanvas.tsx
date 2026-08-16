"use client";

import { useEffect, useRef } from "react";

interface Shape {
  el: HTMLImageElement;
  w: number;
  h: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotV: number;
}

// Logo pill svgs (foreground — larger, move faster, rotate slowly, full opacity)
// Excludes the header logos (gdg-main, gdg-1) — those live in the nav only
const LOGO_PILLS = [
  { src: "/gdg-2.svg",  w: 110, h: 110 }, // GDG circular logo
  { src: "/gdg-5.svg",  w: 120, h: 125 }, // pill logo
  { src: "/gdg-9.svg",  w: 110, h: 65  }, // small logo pill
  { src: "/gdg-11.svg", w: 110, h: 38  }, // horizontal mini
  { src: "/gdg-3.svg",  w:  70, h: 165 }, // vertical strip
  { src: "/gdg-4.svg",  w:  68, h: 163 }, // vertical strip 2
];

// Doodle svgs (background — smaller, slower, lower opacity)
const DOODLES = [
  { src: "/gdg-6.svg",  w: 70, h: 70  },
  { src: "/gdg-8.svg",  w: 65, h: 65  },
  { src: "/gdg-10.svg", w: 50, h: 50  },
  { src: "/gdg-12.svg", w: 60, h: 60  },
  { src: "/gdg-6.svg",  w: 55, h: 55  },
  { src: "/gdg-8.svg",  w: 72, h: 72  },
  { src: "/gdg-10.svg", w: 45, h: 45  },
  { src: "/gdg-12.svg", w: 58, h: 58  },
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function createShape(
  container: HTMLElement,
  src: string,
  w: number,
  h: number,
  speed: number,
  opacity: number
): Shape {
  const el = document.createElement("img");
  el.src = src;
  el.width = w;
  el.height = h;
  el.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: ${w}px;
    height: ${h}px;
    opacity: ${opacity};
    pointer-events: none;
    will-change: transform;
    user-select: none;
    -webkit-user-drag: none;
  `;
  container.appendChild(el);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const x = rand(0, vw - w);
  const y = rand(0, vh - h);
  const angle = rand(0, Math.PI * 2);
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const rot = rand(0, 360);
  const rotV = rand(-0.4, 0.4);

  el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;

  return { el, w, h, x, y, vx, vy, rot, rotV };
}

export default function BounceCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const shapesRef = useRef<Shape[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Clear any previous children
    container.innerHTML = "";
    shapesRef.current = [];

    const shapes: Shape[] = [];

    const isMobile = window.innerWidth <= 640;
    // On mobile: fewer shapes, no doodle layer, smaller sizes, slower
    const pillScale  = isMobile ? 0.55 : 1;
    const pillSpeed  = isMobile ? 0.65 : 1;
    // pick only first 3 pills on mobile to keep it uncluttered
    const pillList   = isMobile ? LOGO_PILLS.slice(0, 3) : LOGO_PILLS;
    const doodleList = isMobile ? [] : DOODLES;

    // Doodle layer first (background, lower z)
    for (const d of doodleList) {
      const s = createShape(container, d.src, d.w, d.h, reduced ? 0 : rand(0.4, 0.9), 0.38);
      s.el.style.zIndex = "1";
      shapes.push(s);
    }

    // Logo pill layer (foreground, higher z)
    for (const p of pillList) {
      const w = Math.round(p.w * pillScale);
      const h = Math.round(p.h * pillScale);
      const s = createShape(container, p.src, w, h, reduced ? 0 : rand(1.1, 1.8) * pillSpeed, 0.92);
      s.el.style.zIndex = "2";
      shapes.push(s);
    }

    shapesRef.current = shapes;

    if (reduced) {
      // Static resting positions — already set during createShape
      return;
    }

    function tick() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      for (const s of shapesRef.current) {
        s.x += s.vx;
        s.y += s.vy;
        s.rot += s.rotV;

        // Wall collision — reverse velocity when edge hits boundary
        if (s.x < 0) { s.x = 0; s.vx = Math.abs(s.vx); }
        else if (s.x + s.w > vw) { s.x = vw - s.w; s.vx = -Math.abs(s.vx); }

        if (s.y < 0) { s.y = 0; s.vy = Math.abs(s.vy); }
        else if (s.y + s.h > vh) { s.y = vh - s.h; s.vy = -Math.abs(s.vy); }

        s.el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rot}deg)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    // On resize: clamp positions to new bounds
    function handleResize() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      for (const s of shapesRef.current) {
        s.x = Math.min(s.x, vw - s.w);
        s.y = Math.min(s.y, vh - s.h);
        if (s.x < 0) s.x = 0;
        if (s.y < 0) s.y = 0;
      }
    }

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
