import { toast } from "sonner";

export function toastSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    classNames: {
      toast: "border-brand-green/20 bg-white text-brand-charcoal shadow-card",
      title: "font-semibold text-brand-green",
      description: "text-muted-foreground",
    },
  });
}

export function toastError(message: string, description?: string) {
  toast.error(message, {
    description,
    classNames: {
      toast: "border-brand-orange/30 bg-white text-brand-charcoal shadow-card",
      title: "font-semibold text-brand-orange",
      description: "text-muted-foreground",
    },
  });
}

export function toastInfo(message: string, description?: string) {
  toast(message, {
    description,
    classNames: {
      toast: "border-brand-sage/40 bg-brand-cream text-brand-charcoal shadow-card",
      title: "font-semibold text-brand-green",
      description: "text-muted-foreground",
    },
  });
}
