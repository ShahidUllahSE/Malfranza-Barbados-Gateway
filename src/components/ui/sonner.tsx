import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-brand-charcoal group-[.toaster]:border-border group-[.toaster]:shadow-card group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-brand-green group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-brand-cream group-[.toast]:text-brand-charcoal",
          success: "group-[.toast]:border-brand-green/25 group-[.toast]:text-brand-green",
          error: "group-[.toast]:border-brand-orange/30 group-[.toast]:text-brand-orange",
          info: "group-[.toast]:border-brand-sage/40 group-[.toast]:text-brand-green",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
