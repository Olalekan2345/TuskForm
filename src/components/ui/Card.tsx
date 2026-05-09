import { forwardRef, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glow";
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", hover, className = "", ...props }, ref) => (
    <div
      ref={ref}
      className={`${variant === "glow" ? "card-glow" : "card"} ${hover ? "card-hover" : ""} ${className}`}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", ...props }, ref) => <div ref={ref} className={className} style={{ padding: 24 }} {...props} />
);
CardContent.displayName = "CardContent";

export { Card, CardContent };
