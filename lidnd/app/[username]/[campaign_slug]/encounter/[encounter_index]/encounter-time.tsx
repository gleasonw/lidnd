import { Timer } from "lucide-react";
import React from "react";
import { useState, useEffect } from "react";

const emptySubscribe = () => () => {};

export function EncounterTime({ time }: { time?: Date }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const timeString = React.useSyncExternalStore(
    emptySubscribe,
    () => timeToDisplay(time, now),
    () => null,
  );

  if (!time) return null;
  return (
    <div className={"flex gap-3 justify-center items-center text-gray-500"}>
      <Timer />
      <div className=" text-sm">{timeString}</div>
    </div>
  );
}

function timeToDisplay(startedAtUTC: Date | undefined, now: Date) {
  // time is in UTC, so we need to convert it to local time
  if (!startedAtUTC) return "0:00";
  const startedAtLocal = new Date(
    startedAtUTC.getTime() - startedAtUTC.getTimezoneOffset() * 60000,
  );
  const diff = now.getTime() - startedAtLocal.getTime();
  const seconds = diff / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  if (days >= 1) {
    return startedAtLocal.toLocaleDateString();
  } else if (hours >= 1) {
    return `${Math.floor(hours)} hour${Math.floor(hours) > 1 ? "s" : ""} ago`;
  } else if (minutes >= 1) {
    return `${Math.floor(minutes)} minute${
      Math.floor(minutes) > 1 ? "s" : ""
    } ago`;
  } else if (seconds >= 1) {
    return `${Math.floor(seconds)} second${
      Math.floor(seconds) > 1 ? "s" : ""
    } ago`;
  } else {
    return "Just now";
  }
}
