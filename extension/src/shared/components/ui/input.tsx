import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "sw-flex sw-h-10 sw-w-full sw-rounded-full sw-border sw-border-white/10 sw-bg-white/5 sw-px-4 sw-py-2 sw-text-sm sw-text-white placeholder:sw-text-gray-500 focus:sw-border-primary focus:sw-outline-none disabled:sw-cursor-not-allowed disabled:sw-opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
