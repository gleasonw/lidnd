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

  if (!time)
    return (
      <div className="flex flex-col gap-1">
        <div className="text-gray-500 text-sm">Started</div>
        <div className="text-gray-500 text-sm">Not started</div>
      </div>
    );

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

  if (days >= 1) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-gray-500 text-sm">Started</div>
        <div className="text-gray-500 text-sm">
          {startedAtLocal.toLocaleDateString()}
        </div>
      </div>
    );
  }

  if (hours >= 1) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-gray-500 text-sm">Started</div>
        <div className="text-gray-500 text-sm">
          {Math.floor(hours)} hour{Math.floor(hours) > 1 ? "s" : ""} ago
        </div>
      </div>
    );
  }

  if (minutes >= 1) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-gray-500 text-sm">Started</div>
        <div className="text-gray-500 text-sm">
          {Math.floor(minutes)} minute{Math.floor(minutes) > 1 ? "s" : ""} ago
        </div>
      </div>
    );
  }

  if (seconds >= 1) {
    return (
      <div className="flex flex-col gap-1">
        <div className="text-gray-500 text-sm">Started</div>
        <div className="text-gray-500 text-sm">
          {Math.floor(seconds)} second{Math.floor(seconds) > 1 ? "s" : ""} ago
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-gray-500 text-sm">Started</div>
      <div className="text-gray-500 text-sm">Just now</div>
    </div>
  );
}
