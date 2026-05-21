import { useUpdateCreature } from "@/encounters/[encounter_index]/hooks";
import type { Creature } from "@/server/api/router";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CreatureUtils } from "@/utils/creatures";
import { MoveDiagonal2 } from "lucide-react";

type DragState =
  | { type: "idle" }
  | {
      type: "dragging";
      pointerId: number;
      startClientX: number;
      startClientY: number;
      startWidth: number;
      startHeight: number;
    };

export function CreatureStatBlock({
  creature,
  ref,
}: {
  creature: Creature;
  ref?: React.ForwardedRef<HTMLImageElement>;
}) {
  return (
    <CreatureStatBlockResizeable
      creature={creature}
      ref={ref}
      key={`${creature.stat_block_width}-${creature.stat_block_height}`}
    />
  );
}

function CreatureStatBlockResizeable({
  creature,
  ref,
}: {
  creature: Creature;
  ref?: React.ForwardedRef<HTMLImageElement>;
}) {
  const { mutate: updateCreature } = useUpdateCreature();

  function handleResizeEnd(nextSize: { width: number; height: number }) {
    updateCreature({
      ...creature,
      stat_block_width: nextSize.width,
      stat_block_height: nextSize.height,
    });
  }

  return (
    <ResizeableImage
      priority
      quality={100}
      src={CreatureUtils.awsURL(creature, "statBlock")}
      alt={creature.name}
      width={creature.stat_block_width}
      height={creature.stat_block_height}
      className="block object-top"
      ref={ref}
      onResizeEnd={handleResizeEnd}
    />
  );
}

export function ResizeableImage({
  src,
  alt,
  width,
  height,
  className,
  priority,
  quality,
  ref,
  onResizeEnd,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  ref?: React.ForwardedRef<HTMLImageElement>;
  onResizeEnd: (size: { width: number; height: number }) => void;
}) {
  const [localSize, setLocalSize] = useState({ width, height });
  const [dragState, setDragState] = useState<DragState>({ type: "idle" });

  return (
    <div
      className="relative inline-block border"
      style={{
        width: localSize.width,
        height: localSize.height,
      }}
    >
      <Image
        priority={priority}
        quality={quality}
        style={{
          objectFit: "contain",
          width: `${localSize.width}px`,
          height: `${localSize.height}px`,
        }}
        className={className}
        src={src}
        alt={alt}
        width={width}
        height={height}
        ref={ref}
      />

      <ImageResizeHandle
        size={localSize}
        setSize={setLocalSize}
        dragState={dragState}
        setDragState={setDragState}
        onResizeEnd={onResizeEnd}
      />
    </div>
  );
}

function ImageResizeHandle({
  size,
  setSize,
  dragState,
  setDragState,
  onResizeEnd,
}: {
  size: { width: number; height: number };
  setSize: (val: { width: number; height: number }) => void;
  dragState: DragState;
  setDragState: (val: DragState) => void;
  onResizeEnd: (size: { width: number; height: number }) => void;
}) {
  const latestSizeRef = useRef(size);

  useEffect(() => {
    latestSizeRef.current = size;
  }, [size]);

  function getNextSize(
    e: React.PointerEvent,
    draggingState: Extract<DragState, { type: "dragging" }>,
  ) {
    const deltaX = e.clientX - draggingState.startClientX;
    const deltaY = e.clientY - draggingState.startClientY;

    return {
      width: Math.max(80, Math.round(draggingState.startWidth + deltaX)),
      height: Math.max(80, Math.round(draggingState.startHeight + deltaY)),
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    setDragState({
      type: "dragging",
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    });
  }

  function finishDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (dragState.type !== "dragging") return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    setDragState({ type: "idle" });
    onResizeEnd(latestSizeRef.current);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (dragState.type !== "dragging") return;
    if (e.pointerId !== dragState.pointerId) return;

    setSize(getNextSize(e, dragState));
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 " />

      <div
        className="absolute right-0 bottom-0 cursor-nwse-resize touch-none rounded-sm opacity-50 bg-background"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <MoveDiagonal2 />
      </div>
    </>
  );
}
