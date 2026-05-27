"use client";

import { useSpeechToText } from "@/hooks/useSpeechToText";

type Props = {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
};

export default function VoiceNoteInput({
  value, onChange, label,
  placeholder = "e.g. Generate a question paper for 3 hour exam duration...",
}: Props) {
  const { listening, error, supported, toggle } = useSpeechToText(value, onChange);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-black">
        {label} <span className="text-sm font-semibold text-black">(For better output)</span>
      </label>

      <div className="relative min-h-33 rounded-3xl border-2 border-dashed border-[#e6e3de] bg-white p-6 overflow-hidden">
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={listening}
          placeholder={placeholder}
          maxLength={2000}
          className="w-full h-19.5 resize-none bg-transparent pr-16 pt-1 outline-none text-[14px] text-[#5f5f5f] placeholder:text-[#bfbdb8] leading-relaxed"
        />

        {/* {supported && (
          <button
            type="button"
            onClick={toggle}
            className={`absolute right-5 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-200 ${
              listening
                ? "border-red-100 bg-red-500 text-white shadow-[0_10px_30px_rgba(239,68,68,0.25)]"
                : "border-[#ece9e3] bg-white text-[#262626] shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:scale-105 hover:border-[#d8d3cc]"
            }`}
            aria-label={listening ? "Stop voice input" : "Start voice input"}
          >
            {listening ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="7" y="7" width="10" height="10" rx="2" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 11v2a7 7 0 0 1-14 0v-2" />
                <path d="M12 19v4" />
              </svg>
            )}
          </button>
        )} */}

        {error && <p className="mt-3 text-[12px] text-red-500">{error}</p>}
      </div>
    </div>
  );
}