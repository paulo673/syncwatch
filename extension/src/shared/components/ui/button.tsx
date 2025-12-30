import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "sw:inline-flex sw:items-center sw:justify-center sw:rounded-md sw:text-sm sw:font-medium sw:transition-colors sw:focus-visible:outline-none sw:focus-visible:ring-2 sw:focus-visible:ring-sky-500 sw:disabled:pointer-events-none sw:disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "sw:bg-sky-500 sw:text-white sw:hover:bg-sky-600",
        secondary: "sw:bg-white/10 sw:text-white sw:hover:bg-white/20",
        ghost: "sw:bg-transparent sw:hover:bg-white/10",
        icon: "sw:bg-transparent sw:hover:bg-white/10 sw:rounded-full",
      },
      size: {
        default: "sw:h-10 sw:px-4 sw:py-2",
        sm: "sw:h-8 sw:px-3",
        lg: "sw:h-12 sw:px-6",
        icon: "sw:h-9 sw:w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
