import { useEffect, useState } from "react";

const KEY = "recently_viewed_products";
const MAX = 20;

function read(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { setIds(read()); }, []);

  const push = (id: string) => {
    const list = [id, ...read().filter((x) => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
    setIds(list);
  };
  const clear = () => {
    localStorage.removeItem(KEY);
    setIds([]);
  };
  return { ids, push, clear };
}
