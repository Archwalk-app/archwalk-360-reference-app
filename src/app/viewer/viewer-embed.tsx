"use client";

import { useEffect, useRef, useState } from "react";
import { viewerInitMessage } from "@/lib/archwalk/protocol";

import { immersiveMessage, isImmersiveMessage } from "@/lib/archwalk/immersive";

export function ViewerEmbed({ src }: { src: string }) {
  const [expanded, setExpanded] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const [unresponsive, setUnresponsive] = useState(false);
  const lastResponse = useRef(0);
  const previousFocus = useRef<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const origin = new URL(src).origin;

  useEffect(() => {
    function receive(event: MessageEvent<unknown>) {
      if (
        event.source !== iframeRef.current?.contentWindow ||
        event.origin !== origin ||
        !isImmersiveMessage(event.data)
      )
        return;
      if (event.data.type === "hello")
        iframeRef.current?.contentWindow?.postMessage(
          immersiveMessage("ready"),
          origin,
        );
      if (event.data.type === "pong") {
        lastResponse.current = performance.now();
        setUnresponsive(false);
      }
      if (event.data.type === "request") {
        setUnresponsive(false);
        setExpanded(event.data.expanded);
      }
    }
    window.addEventListener("message", receive);
    function onLoad() {
      const frame = iframeRef.current?.contentWindow;
      if (!frame) return;
      frame.postMessage(viewerInitMessage(), origin);
      frame.postMessage(immersiveMessage("ready"), origin);
    }

    const node = iframeRef.current;
    node?.addEventListener("load", onLoad);
    return () => {
      node?.removeEventListener("load", onLoad);
      window.removeEventListener("message", receive);
    };
  }, [origin]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      immersiveMessage("changed", expanded),
      origin,
    );
    if (!expanded) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restored: Array<() => void> = [];
    // Hide and disable surrounding content without moving/remounting the iframe.
    let node: HTMLElement | null = wrapper.current;
    while (node && node !== document.body) {
      // Fixed descendants must escape transformed gallery containing blocks.
      const transform = node.style.transform;
      node.style.transform = "none";
      const current = node;
      restored.push(() => {
        current.style.transform = transform;
      });
      for (const sibling of Array.from(node.parentElement?.children || [])) {
        if (
          sibling === node ||
          !(sibling instanceof HTMLElement) ||
          ["SCRIPT", "STYLE"].includes(sibling.tagName)
        )
          continue;
        const inert = sibling.inert,
          hidden = sibling.getAttribute("aria-hidden");
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
        restored.push(() => {
          sibling.inert = inert;
          if (hidden === null) sibling.removeAttribute("aria-hidden");
          else sibling.setAttribute("aria-hidden", hidden);
        });
      }
      node = node.parentElement;
    }
    // Keep focus in the same Viewer so its exit toggle remains immediately usable.
    iframeRef.current?.focus({ preventScroll: true });
    lastResponse.current = performance.now();
    const resume = () => {
      lastResponse.current = performance.now();
    };
    document.addEventListener("visibilitychange", resume);
    const heartbeat = window.setInterval(() => {
      if (document.hidden) {
        resume();
        return;
      }
      if (performance.now() - lastResponse.current > 15000)
        setUnresponsive(true);
      iframeRef.current?.contentWindow?.postMessage(
        immersiveMessage("ping", true),
        origin,
      );
    }, 5000);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", key);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", resume);
      document.body.style.overflow = overflow;
      restored.reverse().forEach((restore) => restore());
      window.removeEventListener("keydown", key);
      previousFocus.current?.focus({ preventScroll: true });
    };
  }, [expanded, origin]);

  return (
    <div
      ref={wrapper}
      data-viewer-immersive={expanded}
      className="h-full w-full"
      style={
        expanded
          ? {
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              width: "100%",
              margin: 0,
              boxSizing: "border-box",
              height: "100dvh",
              background: "#191C1B",
              paddingTop: "env(safe-area-inset-top)",
              paddingRight: "env(safe-area-inset-right)",
              paddingBottom: unresponsive
                ? "calc(env(safe-area-inset-bottom) + 44px)"
                : "env(safe-area-inset-bottom)",
              paddingLeft: "env(safe-area-inset-left)",
            }
          : undefined
      }
    >
      {expanded && unresponsive ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          style={{
            position: "absolute",
            bottom: "env(safe-area-inset-bottom)",
            left: 0,
            width: "100%",
            minHeight: 44,
            background: "#292D24",
            color: "#FAF7EF",
            fontSize: 12,
          }}
        >
          Tour not responding? Exit immersive view
        </button>
      ) : null}
      <iframe
        ref={iframeRef}
        title="ArchWalk 360 Viewer"
        src={src}
        allow="fullscreen"
        allowFullScreen
        className="block h-full w-full border-0"
      />
    </div>
  );
}
