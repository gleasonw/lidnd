"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";

export function GroupBattleLayout({
  monsters,
  players,
  playerTitle,
  monsterTitle,
  children,
  ...props
}: {
  monsters: React.ReactNode[];
  players: React.ReactNode[];
  playerTitle?: React.ReactNode;
  monsterTitle?: React.ReactNode;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="flex flex-col max-w-full" {...props}>
      <div className="flex gap-4 flex-col">
        <AnimatePresence>
          {playerTitle &&
            React.cloneElement(playerTitle as React.ReactElement, {
              key: "player_title",
            })}
          <div
            className="flex overflow-auto max-w-full gap-4 pb-2 px-2"
            key="players"
          >
            {players}
          </div>
          {monsterTitle &&
            React.cloneElement(monsterTitle as React.ReactElement, {
              key: "monster_title",
            })}
          <div
            className="flex overflow-auto max-w-full gap-4 pb-2 px-2"
            key="monsters"
          >
            {monsters}
          </div>
        </AnimatePresence>
        {children}
      </div>
    </div>
  );
}
