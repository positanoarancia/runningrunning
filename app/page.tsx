"use client";

import { useEffect, useState } from "react";
import {
  MAX_SPEED,
  MIN_SPEED,
  clampSpeed,
  formatPace,
  formatSpeed,
  paceFromSpeed,
  parseDecimalInput,
  parseIntegerInput,
  sanitizeSeconds,
  speedFromPace,
} from "@/lib/pace";

const QUICK_SPEEDS = [7, 8, 10, 11, 12, 13];
const DEFAULT_SPEED = 9;

export default function HomePage() {
  const initialPace = paceFromSpeed(DEFAULT_SPEED);
  const [speed, setSpeed] = useState<number>(DEFAULT_SPEED);
  const [speedInput, setSpeedInput] = useState<string>(DEFAULT_SPEED.toFixed(1));
  const [paceMinutesInput, setPaceMinutesInput] = useState<string>(
    String(initialPace.minutes),
  );
  const [paceSecondsInput, setPaceSecondsInput] = useState<string>(
    String(initialPace.seconds).padStart(2, "0"),
  );
  const [lastEdited, setLastEdited] = useState<"speed" | "pace">("speed");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (lastEdited !== "speed") {
      return;
    }

    const nextPace = paceFromSpeed(speed);
    setPaceMinutesInput(String(nextPace.minutes));
    setPaceSecondsInput(String(nextPace.seconds).padStart(2, "0"));
    setError("");
  }, [lastEdited, speed]);

  const currentPace = paceFromSpeed(speed);

  const applySpeed = (nextSpeed: number) => {
    const safeSpeed = clampSpeed(nextSpeed);
    setLastEdited("speed");
    setSpeed(safeSpeed);
    setSpeedInput(safeSpeed.toFixed(1));
  };

  const handleSliderChange = (value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }

    applySpeed(parsed);
  };

  const handleSpeedInputChange = (value: string) => {
    setSpeedInput(value);
    setLastEdited("speed");

    const parsed = parseDecimalInput(value);
    if (parsed === null) {
      setError(value.trim() === "" ? "" : "속도는 0보다 큰 숫자로 입력하세요.");
      return;
    }

    if (parsed < MIN_SPEED || parsed > MAX_SPEED) {
      setError(`속도는 ${MIN_SPEED.toFixed(1)}~${MAX_SPEED.toFixed(1)} km/h 범위로 입력하세요.`);
      return;
    }

    applySpeed(parsed);
  };

  const updatePace = (nextMinutesRaw: string, nextSecondsRaw: string) => {
    setPaceMinutesInput(nextMinutesRaw);
    setPaceSecondsInput(nextSecondsRaw);
    setLastEdited("pace");

    const parsedMinutes = parseIntegerInput(nextMinutesRaw);
    const parsedSeconds = parseIntegerInput(nextSecondsRaw);

    if (parsedMinutes === null || parsedSeconds === null) {
      setError(
        nextMinutesRaw.trim() === "" && nextSecondsRaw.trim() === ""
          ? ""
          : "페이스는 분과 초를 숫자로 입력하세요.",
      );
      return;
    }

    if (parsedSeconds > 59) {
      setError("초는 0부터 59까지만 입력할 수 있습니다.");
      return;
    }

    const nextSpeed = speedFromPace(parsedMinutes, parsedSeconds);

    if (nextSpeed === null) {
      setError("유효한 페이스를 입력하세요.");
      return;
    }

    if (nextSpeed < MIN_SPEED || nextSpeed > MAX_SPEED) {
      setError(
        `입력한 페이스는 ${MIN_SPEED.toFixed(1)}~${MAX_SPEED.toFixed(1)} km/h 범위를 벗어납니다.`,
      );
      return;
    }

    setError("");
    setSpeed(nextSpeed);
    setSpeedInput(nextSpeed.toFixed(1));
  };

  const paceDisplay =
    lastEdited === "pace" && !error
      ? formatPace(
          parseIntegerInput(paceMinutesInput) ?? currentPace.minutes,
          sanitizeSeconds(parseIntegerInput(paceSecondsInput) ?? currentPace.seconds),
        )
      : formatPace(currentPace.minutes, currentPace.seconds);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-10 pt-6 theme-text">
      <header className="mb-5 px-1">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-sky-300/80">
          by 러닝러닝
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight theme-text">
          러닝 페이스 계산기
        </h1>
        <p className="theme-muted mt-2 text-sm leading-6">
          러닝머신 속도 ↔ 페이스 변환
        </p>
      </header>

      <section className="glass relative overflow-hidden rounded-[28px] px-5 pb-5 pt-6">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sky-400/15 to-transparent" />
        <div className="relative flex items-end justify-between gap-3">
          <div>
            <p className="theme-muted text-xs uppercase tracking-[0.18em]">
              현재 페이스
            </p>
            <p className="theme-text mt-2 text-5xl font-black tracking-tight">
              {paceDisplay}
            </p>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3">
          <div className="theme-soft rounded-2xl border px-4 py-3">
            <p className="theme-muted text-xs">현재 속도</p>
            <p className="mt-1 text-2xl font-bold text-sky-300">
              {formatSpeed(speed)} km/h
            </p>
          </div>
          <div className="theme-soft rounded-2xl border px-4 py-3">
            <p className="theme-muted text-xs">변환 기준</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">
              {lastEdited === "speed" ? "속도 입력" : "페이스 입력"}
            </p>
          </div>
        </div>
      </section>

      <section className="glass mt-4 rounded-[28px] px-5 py-5">
        <div className="flex items-center justify-between">
          <label htmlFor="speed-slider" className="text-sm font-semibold theme-text">
            속도 슬라이더
          </label>
          <span className="theme-soft rounded-full border px-3 py-1 text-sm font-semibold text-sky-300">
            {formatSpeed(speed)} km/h
          </span>
        </div>
        <div className="mt-5">
          <input
            id="speed-slider"
            type="range"
            min={MIN_SPEED}
            max={MAX_SPEED}
            step="0.1"
            value={speed}
            onChange={(event) => handleSliderChange(event.target.value)}
          />
        </div>
        <div className="theme-muted mt-3 flex justify-between text-xs">
          <span>{MIN_SPEED.toFixed(1)}</span>
          <span>{MAX_SPEED.toFixed(1)}</span>
        </div>
      </section>

      <section className="glass mt-4 rounded-[28px] px-5 py-5">
        <label
          htmlFor="speed-input"
          className="block text-sm font-semibold theme-text"
        >
          속도 직접 입력
        </label>
        <div className="theme-field mt-3 flex items-center rounded-2xl border px-4 py-3">
          <input
            id="speed-input"
            inputMode="decimal"
            type="number"
            step="0.1"
            min={MIN_SPEED}
            max={MAX_SPEED}
            value={speedInput}
            onChange={(event) => handleSpeedInputChange(event.target.value)}
            className="w-full bg-transparent text-2xl font-bold theme-text outline-none placeholder:text-[var(--muted-soft)]"
            placeholder="9.0"
          />
          <span className="theme-muted text-sm font-medium">km/h</span>
        </div>
      </section>

      <section className="glass mt-4 rounded-[28px] px-5 py-5">
        <p className="text-sm font-semibold theme-text">페이스 직접 입력</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3">
          <input
            inputMode="numeric"
            type="number"
            min="0"
            value={paceMinutesInput}
            onChange={(event) => updatePace(event.target.value, paceSecondsInput)}
            className="theme-field min-w-0 rounded-2xl border px-4 py-3 text-center text-2xl font-bold outline-none placeholder:text-[var(--muted-soft)]"
            placeholder="5"
            aria-label="페이스 분"
          />
          <span className="theme-muted text-xl font-bold">:</span>
          <input
            inputMode="numeric"
            type="number"
            min="0"
            max="59"
            value={paceSecondsInput}
            onChange={(event) => updatePace(paceMinutesInput, event.target.value)}
            className="theme-field min-w-0 rounded-2xl border px-4 py-3 text-center text-2xl font-bold outline-none placeholder:text-[var(--muted-soft)]"
            placeholder="27"
            aria-label="페이스 초"
          />
          <span className="theme-muted text-sm font-medium">/km</span>
        </div>
      </section>

      <section className="glass mt-4 rounded-[28px] px-5 py-5">
        <p className="text-sm font-semibold theme-text">빠른 속도 선택</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {QUICK_SPEEDS.map((value) => {
            const active = Math.abs(speed - value) < 0.05;

            return (
              <button
                key={value}
                type="button"
                onClick={() => applySpeed(value)}
                className={`rounded-2xl px-4 py-3 text-base font-bold transition ${
                  active
                    ? "bg-sky-400 text-slate-950"
                    : "theme-soft border theme-text hover:bg-sky-100/60"
                }`}
              >
                {value}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4 min-h-6 px-1 text-sm text-rose-400 dark:text-rose-300">
        {error ? error : ""}
      </div>

      <footer className="theme-muted mt-auto px-1 pt-4 text-sm leading-6">
        예시: 11 km/h는 {formatPace(5, 27)}, 5:50 /km는 10.29 km/h입니다.
      </footer>
    </main>
  );
}
