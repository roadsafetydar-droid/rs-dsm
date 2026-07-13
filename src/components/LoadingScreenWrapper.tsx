"use client";

import { useState, useEffect } from "react";
import LoadingScreen from "./LoadingScreen";

export default function LoadingScreenWrapper() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Hide loading screen after animation completes
    const timer = setTimeout(() => setShow(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return <LoadingScreen onComplete={() => setShow(false)} />;
}