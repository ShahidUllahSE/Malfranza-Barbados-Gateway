import logoAsset from "@/assets/malfranza_logo_exact_clean.svg";

export function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  return (
    <img
      src={logoAsset}
      alt="Malfranza Apartments & Taxi"
      className={className}
      loading="eager"
    />
  );
}
