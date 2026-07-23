import { useEffect, useRef, type ReactNode } from "react";

/**
 * Gentle scroll-triggered fade+rise. Reveals once when the element
 * enters the viewport. Prefers-reduced-motion is respected.
 */
export function Reveal({
  children, className = "", delay = 0, as: Tag = "div",
}: { children: ReactNode; className?: string; delay?: number; as?: React.ElementType }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-revealed");
      return;
    }

    const inViewport = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return rect.top < vh + 40 && rect.bottom > -40;
    };

    // Already on screen (e.g. homepage first paint) — reveal immediately.
    if (inViewport()) {
      el.classList.add("is-revealed");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add("is-revealed");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.01, rootMargin: "40px 0px 40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Comp = Tag as any;
  return (
    <Comp
      ref={ref as any}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Comp>
  );
}
