"use client";

import { useEffect, useState } from "react";

// true quando a tela é de celular (até 700px de largura)
export function useCelular(max = 700) {
  const [cel, setCel] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${max}px)`);
    const ver = () => setCel(mq.matches);
    ver();
    mq.addEventListener("change", ver);
    return () => mq.removeEventListener("change", ver);
  }, [max]);
  return cel;
}
