import { Timer } from "lucide-react";
import { useState, useEffect } from "react";

export function EncounterTime({ time }: { time?: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!time) return <div></div>;

  // time is in UTC, so we need to convert it to local time
  const startedAtUTC = new Date(time);
  const startedAtLocal = new Date(
    startedAtUTC.getTime() - startedAtUTC.getTimezoneOffset() * 60000
  );
  const diff = now.getTime() - startedAtLocal.getTime();
  const seconds = diff / 1000;
  const minutes = seconds / 60;
  const hours = minutes / 60;
  const days = hours / 24;

  let timeString = "";
  if (days >= 1) {
    timeString = startedAtLocal.toLocaleDateString();
  } else if (hours >= 1) {
    timeString = `${Math.floor(hours)} hour${
      Math.floor(hours) > 1 ? "s" : ""
    } ago`;
  } else if (minutes >= 1) {
    timeString = `${Math.floor(minutes)} minute${
      Math.floor(minutes) > 1 ? "s" : ""
    } ago`;
  } else if (seconds >= 1) {
    timeString = `${Math.floor(seconds)} second${
      Math.floor(seconds) > 1 ? "s" : ""
    } ago`;
  } else {
    timeString = "Just now";
  }

  return (
    <div className={"flex gap-5 items-center text-gray-500"}>
      <Timer />
      <div className=" text-sm">{timeString}</div>
    </div>
  );
}
