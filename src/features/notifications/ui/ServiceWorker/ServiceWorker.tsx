"use client";

import { useEffect } from "react";

import { useI18n } from "@/shared/i18n/useI18n";

// Whether this build runs a worker; development and tests never do
const usesWorker = () => process.env.NODE_ENV === "production" && "serviceWorker" in navigator;

// Installs the service worker that shows the offline page in the page's language
const ServiceWorker = () => {
  const { locale } = useI18n();

  // Registers in production only and after the load, so the page never waits
  useEffect(() => {
    if (!usesWorker()) return;
    // Registers the worker; a browser that refuses it simply has no offline page
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  // Tells the worker the language, so the offline page it keeps matches the app
  useEffect(() => {
    if (!usesWorker()) return;
    void navigator.serviceWorker.ready
      .then((registration) => registration.active?.postMessage({ type: "locale", locale }))
      .catch(() => {});
  }, [locale]);

  return null;
};

export default ServiceWorker;
