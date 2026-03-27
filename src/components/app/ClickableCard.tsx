import type { KeyboardEvent, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ClickableCardProps {
  children: ReactNode;
  onClick: () => void;
  className?: string;
  ariaLabel: string;
}

export default function ClickableCard({ children, onClick, className, ariaLabel }: ClickableCardProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        "cursor-pointer transition-all hover:border-primary/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
    >
      {children}
    </Card>
  );
}
