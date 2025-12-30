import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "sw:flex sw:h-10 sw:w-full sw:rounded-full sw:border sw:border-white/10 sw:bg-white/5 sw:px-4 sw:py-2 sw:text-sm sw:text-white sw:placeholder:text-gray-500 sw:focus:border-sky-500 sw:focus:outline-none sw:disabled:cursor-not-allowed sw:disabled:opacity-50",
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
