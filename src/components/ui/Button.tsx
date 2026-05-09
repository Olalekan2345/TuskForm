"use client";
import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const variantClass: Record<string, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  outline: "btn-outline",
  danger: "btn-danger",
  success: "btn-success",
};
const sizeClass: Record<string, string> = {
  sm: "btn-sm", md: "btn-md", lg: "btn-lg", xl: "btn-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, icon, iconRight, children, className = "", ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`btn ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
);
Button.displayName = "Button";
export { Button };
