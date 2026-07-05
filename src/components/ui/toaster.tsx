import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider as RadixToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <RadixToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        let Icon = Info;
        if (variant === "success") Icon = CheckCircle2;
        if (variant === "destructive") Icon = AlertCircle;
        if (variant === "warning") Icon = AlertTriangle;
        
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex gap-3 items-start">
              <Icon className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </RadixToastProvider>
  );
}
