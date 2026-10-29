"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { usePathname } from "next/navigation";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Inline head script: marks the page as animatable before first paint (so
 * elements can start transparent), unless the visitor prefers reduced motion.
 * If GSAP has not started within 3 s, the mark is removed and content shows.
 */
export const motionInitScript = `(function(){try{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var d=document.documentElement;d.classList.add('motion-ok');setTimeout(function(){if(!d.classList.contains('motion-ready'))d.classList.remove('motion-ok')},3000)}catch(e){}})();`;

/**
 * Page animations, declared in markup:
 * - `data-anim-step`: hero elements, revealed in sequence on load
 * - `data-reveal`: fades and rises into view on scroll (siblings are staggered)
 * - `data-float`: decorative shapes that drift slowly
 * - `data-count="26"`: numbers that count up when revealed
 * Only opacity and transforms are animated, so content is never hidden from
 * assistive technology or tests.
 */
export function Motion() {
  const pathname = usePathname();

  useGSAP(
    () => {
      const root = document.documentElement;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo("[data-anim-step]", { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", stagger: 0.09, delay: 0.05 });

        gsap.utils.toArray<HTMLElement>("[data-float]").forEach((el, i) => {
          gsap.to(el, { y: i % 2 ? 18 : -18, rotation: i % 2 ? -8 : 8, duration: 3.2 + i * 0.6, ease: "sine.inOut", repeat: -1, yoyo: true });
        });

        ScrollTrigger.batch("[data-reveal]", {
          start: "top 90%",
          once: true,
          onEnter: (els) => gsap.fromTo(els, { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out", stagger: 0.07, overwrite: true }),
        });

        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const target = Number(el.dataset.count);
          if (!Number.isFinite(target)) return;
          const final = el.textContent;
          const counter = { v: 0 };
          gsap.to(counter, {
            v: target,
            duration: 1.4,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 95%", once: true },
            onUpdate: () => {
              el.textContent = String(Math.round(counter.v));
            },
            onComplete: () => {
              el.textContent = final;
            },
          });
        });
      });
      root.classList.add("motion-ready");
      return () => mm.revert();
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return null;
}
