"use client";

import { useEffect, useRef } from "react";

const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js";
const VANTA_NET_URL = "https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js";
const THREE_INTEGRITY = "sha384-9EQoUIJYrv09/oYhSxnw1VpLcfPw3BM9dE7+D/3wGUPeLLa7F9Z6OAoD+i/M6FK9";
const VANTA_NET_INTEGRITY = "sha384-L0sjdcIWJ156WmvbxIBHx79j1WrCqANCyw456nl/aPWSYiHNywEU2VIAcbSJeIiX";

type VantaEffect = {
  destroy: () => void;
};

type VantaNetOptions = {
  el: HTMLElement;
  mouseControls: boolean;
  touchControls: boolean;
  gyroControls: boolean;
  minHeight: number;
  minWidth: number;
  scale: number;
  scaleMobile: number;
  color: number;
  backgroundColor: number;
  points: number;
  maxDistance: number;
  spacing: number;
  showDots: boolean;
};

declare global {
  interface Window {
    VANTA?: {
      NET?: (options: VantaNetOptions) => VantaEffect;
    };
  }
}

let threePromise: Promise<void> | null = null;
let vantaPromise: Promise<void> | null = null;

function loadScript(id: string, src: string, integrity: string) {
  if (document.getElementById(id)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.integrity = integrity;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function loadVantaNet() {
  threePromise ||= loadScript("three-r134", THREE_URL, THREE_INTEGRITY);
  vantaPromise ||= threePromise.then(() => loadScript("vanta-net-0524", VANTA_NET_URL, VANTA_NET_INTEGRITY));
  return vantaPromise;
}

export function VantaLoginBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compactViewport = window.matchMedia("(max-width: 640px)").matches;
    if (reducedMotion || compactViewport) return;

    let cancelled = false;
    let effect: VantaEffect | null = null;

    loadVantaNet()
      .then(() => {
        if (cancelled || !ref.current || !window.VANTA?.NET) return;

        effect = window.VANTA.NET({
          el: ref.current,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1,
          color: 0x76a9bb,
          backgroundColor: 0x111a2a,
          points: 9,
          maxDistance: 21,
          spacing: 17,
          showDots: true
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      effect?.destroy();
    };
  }, []);

  return <div ref={ref} className="login-vanta" aria-hidden="true" />;
}
