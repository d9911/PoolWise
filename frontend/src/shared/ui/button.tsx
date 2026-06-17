import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-pill border px-4 py-2 text-sm font-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-white/25 bg-transparent text-ink hover:border-white/40 hover:bg-canvas-soft",
        primary: "border-white bg-white text-canvas hover:bg-white/90",
        accent: "border-accent-sunset/50 bg-transparent text-accent-sunset hover:border-accent-sunset hover:bg-accent-sunset/10",
        danger: "border-white/25 bg-transparent text-body hover:border-white/40 hover:bg-canvas-soft"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";
