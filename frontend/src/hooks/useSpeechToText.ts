"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SR = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: SpeechRecognitionResult) => void) | null;
  onerror:  ((e: { error?: string }) => void) | null;
  onend:    (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SR;
    webkitSpeechRecognition?: new () => SR;
  }
}

const MAX_CHARS = 2000;

const getSR = () =>
  typeof window !== "undefined"
    ? window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
    : null;

export function useSpeechToText(
  value: string,
  onChange: (v: string) => void,
  lang = "en-IN"
) {
  const [listening, setListening] = useState(false);
  const [error, setError]         = useState("");
  const supported                  = !!getSR();

  const srRef       = useRef<SR | null>(null);
  const baseRef     = useRef(value);          // text before session started
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Keep base in sync when not listening
  useEffect(() => { if (!listening) baseRef.current = value; }, [value, listening]);

  // Build + wire recognition once per lang
  useEffect(() => {
    const SRApi = getSR();
    if (!SRApi) return;

    const sr = new SRApi();
    sr.lang           = lang;
    sr.continuous     = true;
    sr.interimResults = true;

    sr.onresult = (e) => {
        const last = e.results[e.results.length - 1];
        const t    = last?.[0]?.transcript ?? "";

        if (last?.isFinal) {
            baseRef.current = clip(`${baseRef.current} ${t}`.trim());
            onChangeRef.current(baseRef.current);
        } else {
            onChangeRef.current(clip(`${baseRef.current} ${t}`.trim()));
        }
    };

    sr.onerror = (e) => {
      setError(e.error === "not-allowed"
        ? "Microphone access denied."
        : `Mic error: ${e.error ?? "unknown"}`);
      setListening(false);
    };

    sr.onend = () => setListening(false);

    srRef.current = sr;
    return () => { sr.abort(); srRef.current = null; };
  }, [lang]);

  const toggle = useCallback(() => {
    if (!srRef.current) return;
    setError("");

    if (listening) {
      srRef.current.stop();
    } else {
      baseRef.current = value;
      try { srRef.current.start(); setListening(true); }
      catch { setError("Could not start microphone. Try again."); }
    }
  }, [listening, value]);

  return { listening, error, supported, toggle };
}

function clip(s: string) {
  return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) : s;
}