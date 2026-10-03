import { m } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { easeOut } from "./ease";

type EntranceProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function Entrance({ children, delay = 0, className }: EntranceProps) {
  return (
    <m.div
      className={cn(className)}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, ease: easeOut, delay }}
    >
      {children}
    </m.div>
  );
}