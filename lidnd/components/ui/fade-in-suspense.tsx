"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Suspense } from "react";

export interface FadeInSuspenseProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  wrapperClassName?: string;
}

export function FadeInSuspense(props: FadeInSuspenseProps) {
  const { children, fallback } = props;
  return (
    <AnimatePresence>
      <Suspense fallback={fallback}>
        <motion.div
          initial={{ opacity: 0, height: "100%" }}
          animate={{
            opacity: 1,
            transition: { duration: 0.1 },
            height: "100%",
          }}
        >
          {children}
        </motion.div>
      </Suspense>
    </AnimatePresence>
  );
}
