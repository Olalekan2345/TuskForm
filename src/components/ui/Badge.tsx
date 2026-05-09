import { HTMLAttributes, ReactNode } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "primary"|"success"|"warning"|"danger"|"cyan"|"violet"|"ghost";
  dot?: boolean;
  icon?: ReactNode;
}

const vc: Record<string,string> = {
  primary: "badge-primary", success: "badge-success", warning: "badge-warning",
  danger: "badge-danger", cyan: "badge-cyan", violet: "badge-violet", ghost: "badge-ghost",
};
const dc: Record<string,string> = {
  primary:"#818cf8", success:"#34d399", warning:"#fbbf24",
  danger:"#f87171", cyan:"#22d3ee", violet:"#a78bfa", ghost:"#64748b",
};

export function Badge({ variant="primary", dot, icon, children, className="", ...props }: BadgeProps) {
  return (
    <span className={`badge ${vc[variant]} ${className}`} {...props}>
      {dot && <span style={{ width:6,height:6,borderRadius:"50%",background:dc[variant],animation:"pulse 2s infinite",flexShrink:0 }} />}
      {icon}
      {children}
    </span>
  );
}
