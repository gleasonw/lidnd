"use client";

import { Group, Panel } from "react-resizable-panels";
import type { PropsWithChildren } from "react";

type LidndPanelGroupProps = PropsWithChildren<
  React.ComponentProps<typeof Group>
>;

function LidndPanelGroup({ children, ...props }: LidndPanelGroupProps) {
  return (
    <Group className="flex gap-2 h-full w-full" {...props}>
      {children}
    </Group>
  );
}

function LidndPanel({
  children,
  ...props
}: PropsWithChildren<React.ComponentProps<typeof Panel>>) {
  return (
    <Panel className="flex h-full w-full bg-gray-500 m-2" {...props}>
      {children}
    </Panel>
  );
}

export function ResizeTest() {
  return (
    <LidndPanelGroup onLayoutChange={(p) => console.log({ p })}>
      <LidndPanel>left</LidndPanel>
      <LidndPanel className="bg-none">
        <LidndPanelGroup
          orientation="vertical"
          onLayoutChange={(l) => console.log({ l })}
        >
          <LidndPanel>top</LidndPanel>
          <LidndPanel className="bg-none">
            <LidndPanelGroup
              orientation="horizontal"
              onLayoutChange={(r) => console.log({ r })}
            >
              <LidndPanel>left</LidndPanel>
              <LidndPanel>right</LidndPanel>
            </LidndPanelGroup>
          </LidndPanel>
        </LidndPanelGroup>
      </LidndPanel>
      <LidndPanel>right</LidndPanel>
    </LidndPanelGroup>
  );
}
