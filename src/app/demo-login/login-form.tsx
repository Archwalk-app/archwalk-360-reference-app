"use client";
import { useState } from "react";
export function LoginForm({
  returnTo,
  configured,
}: {
  returnTo: string;
  configured: boolean;
}) {
  const [visible, setVisible] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        const form = event.currentTarget;
        setPending(true);
        setError("");
        try {
          const response = await fetch("/api/demo/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              password: new FormData(form).get("password"),
              returnTo,
            }),
          });
          const result = await response.json();
          if (!response.ok) {
            setError(result.error || "Unable to unlock demo.");
            setPending(false);
            return;
          }
          form.reset();
          window.location.assign(result.returnTo);
        } catch {
          setError("Unable to connect. Please try again.");
          setPending(false);
        }
      }}
    >
      <label htmlFor="demo-password" className="block text-sm font-medium">
        Demo password
      </label>
      <div className="mt-2 flex rounded-md border border-border bg-surface focus-within:ring-2 focus-within:ring-accent">
        <input
          id="demo-password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          required
          maxLength={1024}
          disabled={!configured || pending}
          className="min-h-12 min-w-0 flex-1 rounded-l-md px-3 outline-none"
          aria-describedby={error ? "login-error" : undefined}
        />
        <button
          type="button"
          aria-pressed={visible}
          aria-controls="demo-password"
          className="min-h-12 min-w-16 px-3 text-sm text-accent"
          onClick={() => setVisible(!visible)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {error && (
        <p id="login-error" role="alert" className="mt-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!configured || pending}
        className="museum-primary mt-5 w-full justify-center disabled:opacity-50"
      >
        {pending ? "Unlocking…" : "Unlock demo"}
      </button>
      {!configured && (
        <p role="status" className="mt-4 text-sm text-muted">
          Demo access is unavailable. Please contact the owner.
        </p>
      )}
    </form>
  );
}
