"use client";

import { trackDemoOpen } from "@/lib/demo-analytics";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isAnalyticsPath, validMeasurementId } from "@/lib/analytics-policy";
import {
  observeAnalyticsConsent, trackPageView, analyticsAllowed, readAnalyticsConsent,
  setAnalyticsConsent, startAnalytics, pauseAnalytics,
} from "@/lib/analytics-runtime";

function subscribe(notify: () => void) {
  return observeAnalyticsConsent(notify);
}
function eligibleSnapshot() { return analyticsAllowed(); }
function noEligibility() { return false; }
function noConsent() { return null; }

const OPEN_COOKIE_PREFERENCES_EVENT = "archwalk:open-cookie-preferences";

export function CookiePreferencesButton() {
  const eligible = useSyncExternalStore(subscribe, eligibleSnapshot, noEligibility);
  if (!eligible) return null;
  return (
    <button
      type="button"
      className="marketing-text-link inline-flex min-h-11 items-center text-left focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#44594C]"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))}
    >
      Cookie preferences
    </button>
  );
}

export function DemoAnalytics() {
  const pathname = usePathname();
  const eligible = useSyncExternalStore(subscribe, eligibleSnapshot, noEligibility);
  const consent = useSyncExternalStore(subscribe, readAnalyticsConsent, noConsent);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  useEffect(() => {
    if (!eligible) return;
    const open = () => {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPreferencesOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, open);
  }, [eligible]);

  useEffect(() => {
    if (preferencesOpen) headingRef.current?.focus({ preventScroll: true });
  }, [preferencesOpen]);

  useEffect(() => {
    if (!eligible || consent !== "granted") {
      pauseAnalytics();
      return;
    }
    startAnalytics();
    trackPageView();
    trackDemoOpen();

  }, [eligible, consent, pathname]);

  if (!eligible || !isAnalyticsPath(pathname) || !validMeasurementId(id)) return null;
  const choosing = consent === null || preferencesOpen;
  const closePreferences = () => {
    setPreferencesOpen(false);
    if (openerRef.current?.isConnected) openerRef.current.focus({ preventScroll: true });
  };
  const choose = (value: "granted" | "denied") => {
    setAnalyticsConsent(value);
    closePreferences();
  };
  return (
    <>
      <footer className="museum-container py-3 text-sm"><CookiePreferencesButton />{" | "}<a href="https://archwalk.app/privacy">Privacy policy</a></footer>
      {consent === "granted" && <Script id="archwalk-ga4" src={"https://www.googletagmanager.com/gtag/js?id=" + id} strategy="afterInteractive" />}
      {choosing && (
        <section
          aria-labelledby="analytics-consent-heading"
          aria-describedby="analytics-consent-description"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] z-50 max-w-[320px] rounded-xl border border-[#D9D1C4] bg-[#FAF7F2] p-3 text-[#1F2423] shadow-[0_2px_8px_rgba(31,36,35,0.06)]"
          onKeyDown={(event) => {
            if (event.key === "Escape" && preferencesOpen) {
              event.preventDefault();
              closePreferences();
            }
          }}
        >
          <h2 id="analytics-consent-heading" ref={headingRef} tabIndex={-1} className="text-sm font-semibold leading-5 tracking-tight outline-none">
            Optional analytics
          </h2>
          <p id="analytics-consent-description" className="mt-2 text-[13px] leading-5 text-[#5F6661]">
            Optional analytics across archwalk.app and demo.archwalk.app. Your choice applies to both sites; withdraw here on either site. Off until you agree.{" "}
            <a href="https://archwalk.app/privacy" className="underline decoration-[#A5A99F] underline-offset-4 hover:text-[#44594C] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#44594C]">Privacy policy.</a>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => choose("denied")} className="min-h-11 rounded-lg border border-[#D9D1C4] px-4 text-sm font-medium transition-colors hover:bg-[#F1ECE5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#44594C]">Decline</button>
            <button type="button" onClick={() => choose("granted")} className="min-h-11 rounded-lg border border-[#D9D1C4] bg-[#F1ECE5] px-4 text-sm font-medium transition-colors hover:bg-[#E8E2D9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#44594C]">Accept</button>
          </div>
        </section>
      )}
    </>
  );
}
