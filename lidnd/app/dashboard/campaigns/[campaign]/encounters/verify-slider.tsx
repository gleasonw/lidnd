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

type VerificationStatus = "idle" | "initial" | "dragging" | "verified";

function VerifySliderDragger(props: VerifySliderProps) {
  const { initial, verified } = props;
  const [status, setStatus] = React.useState<VerificationStatus>("idle");
  const [left, setLeft] = React.useState(0);

  function handleMouseDown(e: React.MouseEvent) {
    setStatus("dragging");
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (status !== "dragging") {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setLeft(x);
  }

  function handleMouseUp(e: React.MouseEvent) {
    setStatus("initial");
  }

  const InitialTransitionButton = React.cloneElement(initial, {
    onClick: () => {
      setStatus("initial");
    },
  });

  if (status === "verified") {
    return verified;
  }

  if (status === "idle") {
    return InitialTransitionButton;
  }

  return (
    <div className="relative w-20 h-10 border border-red-600">
      <span
        className="absolute w-5 h-5 bg-green-800"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{
          left: left + "px",
        }}
      />
    </div>
  );
}
