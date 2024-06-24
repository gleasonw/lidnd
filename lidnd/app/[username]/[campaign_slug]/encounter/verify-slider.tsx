"use client";

import { Button } from "@/components/ui/button";
import React, { useEffect } from "react";

export interface VerifySliderProps {
  initial: React.ReactElement;
  verified: React.ReactNode;
}

type VerificationYNStatus = "idle" | "prompt" | "verified";

export function VerifySlider(props: VerifySliderProps) {
  const { initial, verified } = props;
  const [status, setStatus] = React.useState<VerificationYNStatus>("idle");

  const InitialTransitionButton = React.cloneElement(initial, {
    onClick: () => {
      setStatus("prompt");
    },
  });

  useEffect(() => {
    window.addEventListener("keydown", (e) => {
      if (status !== "prompt") {
        return;
      }
      if (e.key === "y") {
        setStatus("verified");
      } else if (e.key === "n") {
        setStatus("idle");
      }
    });

    return () => {
      window.removeEventListener("keydown", () => {});
    };
  }, [status]);

  const ui: Record<VerificationYNStatus, React.ReactNode> = {
    idle: InitialTransitionButton,
    prompt: <Button variant="destructive">Are you sure? (y/n)</Button>,
    verified,
  };

  return ui[status];
}
