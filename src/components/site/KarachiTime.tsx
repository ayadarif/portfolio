"use client";

// Karachi local time, rendered on the client only. The span has a fixed width so nothing shifts when the time appears.
import { useEffect, useState } from "react";

export default function KarachiTime() {
  const [t, setT] = useState("");
  useEffect(() => {
    const f = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Karachi" });
    const tick = () => setT(f.format(new Date()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return <span className="inline-block min-w-[5.5ch] font-mono tabular-nums">{t ? `${t} PKT` : " "}</span>;
}
