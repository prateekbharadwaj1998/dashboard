"use client";
// Followed teams (ESPN ids) and pinned competitions, stored per browser.
import { useCallback, useEffect, useState } from "react";

export interface FollowedTeam {
  id: string;
  name: string;
  logo?: string;
  league?: string;
}

const KEY = "halfspace:teams:v2";
const EVT = "halfspace:follow";

function read(): FollowedTeam[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function useFollowedTeams() {
  const [teams, setTeams] = useState<FollowedTeam[]>([]);
  useEffect(() => {
    setTeams(read());
    const on = () => setTeams(read());
    window.addEventListener(EVT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  const toggle = useCallback((t: FollowedTeam) => {
    const cur = read();
    const next = cur.some((x) => x.id === t.id) ? cur.filter((x) => x.id !== t.id) : [...cur, t];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(EVT));
  }, []);
  return { teams, ids: new Set(teams.map((t) => t.id)), toggle };
}

// ---------------------------------------------------------------- pinned competitions
const PIN_KEY = "halfspace:comps:v1";
const PIN_EVT = "halfspace:pins";

function readPins(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PIN_KEY) || "[]");
  } catch {
    return [];
  }
}

export function usePinnedComps() {
  const [pins, setPins] = useState<string[]>([]);
  useEffect(() => {
    setPins(readPins());
    const on = () => setPins(readPins());
    window.addEventListener(PIN_EVT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(PIN_EVT, on);
      window.removeEventListener("storage", on);
    };
  }, []);
  const toggle = useCallback((slug: string) => {
    const cur = readPins();
    const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
    try {
      localStorage.setItem(PIN_KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new Event(PIN_EVT));
  }, []);
  return { pins, toggle };
}
