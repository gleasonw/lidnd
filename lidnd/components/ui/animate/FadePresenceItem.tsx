import { motion } from "framer-motion";
import React from "react";

export interface FadePresenceItemProps {
  children?: React.ReactNode;
  className?: string;
}

export function FadePresenceItem({ children, className }: FadePresenceItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.1 } }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
