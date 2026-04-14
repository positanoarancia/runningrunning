"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAX_SPEED,
  MIN_SPEED,
  clampPaceSliderSeconds,
  formatEstimatedDuration,
  formatPace,
  formatPaceSeconds,
  formatSpeed,
  paceFromSpeed,
  paceSecondsFromSpeed,
  parseDecimalInput,
  parseIntegerInput,
  speedFromPace,
} from "@/lib/pace";

const SPEED_MARKS = [6, 8, 10, 12, 14, 16, 18];
const PACE_MARKS = [600, 450, 360, 300, 257, 225, 200];
const DEFAULT_SPEED = 9;
const DEFAULT_POSITION = Math.round(((DEFAULT_SPEED - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 1000);
const SLIDER_MAX = 1000;
const SPEED_HAPTIC_STEP = 0.5;
const PACE_HAPTIC_STEP = 15;

type ActiveMode = "speed" | "pace";

function triggerHaptic() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  navigator.vibrate(10);
}

export default function HomePage() {
  const [activeMode, setActiveMode] = useState<ActiveMode>("speed");
  const [sliderPosition, setSliderPosition] = useState<number>(DEFAULT_POSITION);
  const [showPrecisionInput, setShowPrecisionInput] = useState<boolean>(false);
  const [introHighlight, setIntroHighlight] = useState<ActiveMode | null>(null);
  const [speedInput, setSpeedInput] = useState<string>(DEFAULT_SPEED.toFixed(1));
  const initialPace = paceFromSpeed(DEFAULT_SPEED);
  const [paceMinutesInput, setPaceMinutesInput] = useState<string>(
    String(initialPace.minutes),
  );
  const [paceSecondsInput, setPaceSecondsInput] = useState<string>(
    String(initialPace.seconds).padStart(2, "0"),
  );
  const [error, setError] = useState<string>("");
  const lastSpeedHapticMark = useRef<number | null>(null);
  const lastPaceHapticMark = useRef<number | null>(null);

  const speedFromPosition = (position: number) =>
    MIN_SPEED + ((MAX_SPEED - MIN_SPEED) * position) / SLIDER_MAX;

  const positionFromSpeed = (speed: number) =>
    Math.round(((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * SLIDER_MAX);

  const currentSpeed = speedFromPosition(sliderPosition);
  const currentPace = paceFromSpeed(currentSpeed);
  const currentPaceSeconds = paceSecondsFromSpeed(currentSpeed);
  const currentPaceValue = `${currentPace.minutes}:${String(currentPace.seconds).padStart(2, "0")}`;
  const currentPaceLabel = formatPace(currentPace.minutes, currentPace.seconds);
  const estimated10k = formatEstimatedDuration(currentPaceSeconds * 10);
  const estimatedHalf = formatEstimatedDuration(currentPaceSeconds * 21.1);

  useEffect(() => {
    setSpeedInput(currentSpeed.toFixed(1));
    setPaceMinutesInput(String(currentPace.minutes));
    setPaceSecondsInput(String(currentPace.seconds).padStart(2, "0"));
  }, [currentPace.minutes, currentPace.seconds, currentSpeed]);

  useEffect(() => {
    const toPace = window.setTimeout(() => setIntroHighlight("pace"), 450);
    const toSpeed = window.setTimeout(() => setIntroHighlight("speed"), 1100);
    const clear = window.setTimeout(() => setIntroHighlight(null), 1750);

    return () => {
      window.clearTimeout(toPace);
      window.clearTimeout(toSpeed);
      window.clearTimeout(clear);
    };
  }, []);

  const updateFromSliderPosition = (nextPosition: number, mode: ActiveMode) => {
    const safePosition = Math.min(SLIDER_MAX, Math.max(0, Math.round(nextPosition)));
    setSliderPosition(safePosition);
    setActiveMode(mode);
    setError("");
  };

  const maybeTriggerSpeedHaptic = (nextSpeed: number) => {
    const mark = Math.round(nextSpeed / SPEED_HAPTIC_STEP);
    if (lastSpeedHapticMark.current === mark) {
      return;
    }

    lastSpeedHapticMark.current = mark;

    if (Math.abs(nextSpeed - mark * SPEED_HAPTIC_STEP) < 0.051) {
      triggerHaptic();
    }
  };

  const maybeTriggerPaceHaptic = (paceSeconds: number) => {
    const mark = Math.round(paceSeconds / PACE_HAPTIC_STEP);
    if (lastPaceHapticMark.current === mark) {
      return;
    }

    lastPaceHapticMark.current = mark;

    if (Math.abs(paceSeconds - mark * PACE_HAPTIC_STEP) <= 2) {
      triggerHaptic();
    }
  };

  const handleSliderChange = (value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }

    if (activeMode === "speed") {
      maybeTriggerSpeedHaptic(speedFromPosition(parsed));
    } else {
      const nextPace = paceFromSpeed(speedFromPosition(parsed));
      maybeTriggerPaceHaptic(nextPace.minutes * 60 + nextPace.seconds);
    }

    updateFromSliderPosition(parsed, activeMode);
  };

  const handleSpeedInputChange = (value: string) => {
    setSpeedInput(value);
    setActiveMode("speed");

    const parsed = parseDecimalInput(value);
    if (parsed === null) {
      setError(value.trim() === "" ? "" : "속도는 0보다 큰 숫자로 입력하세요.");
      return;
    }

    if (parsed < MIN_SPEED || parsed > MAX_SPEED) {
      setError(`속도는 ${MIN_SPEED.toFixed(1)}~${MAX_SPEED.toFixed(1)} km/h 범위로 입력하세요.`);
      return;
    }

    updateFromSliderPosition(positionFromSpeed(parsed), "speed");
  };

  const handlePaceInputChange = (nextMinutesRaw: string, nextSecondsRaw: string) => {
    setPaceMinutesInput(nextMinutesRaw);
    setPaceSecondsInput(nextSecondsRaw);
    setActiveMode("pace");

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

    const totalSeconds = parsedMinutes * 60 + parsedSeconds;
    const clampedSeconds = clampPaceSliderSeconds(totalSeconds);

    if (totalSeconds !== clampedSeconds) {
      setError("페이스는 3:20/km부터 10:00/km 사이로 입력하세요.");
      return;
    }

    const nextSpeed = speedFromPace(parsedMinutes, parsedSeconds);
    if (nextSpeed === null) {
      setError("유효한 페이스를 입력하세요.");
      return;
    }

    updateFromSliderPosition(positionFromSpeed(nextSpeed), "pace");
  };

  const sliderLabel = activeMode === "speed" ? "속도 슬라이더" : "페이스 슬라이더";
  const sliderValueLabel =
    activeMode === "speed" ? `${formatSpeed(currentSpeed)} km/h` : currentPaceLabel;
  const currentMarkValue = activeMode === "speed" ? currentSpeed : currentPace.minutes * 60 + currentPace.seconds;
  const activeMarks = activeMode === "speed" ? SPEED_MARKS : PACE_MARKS;
  const nearestMark = activeMarks.reduce((closest, mark) =>
    Math.abs(mark - currentMarkValue) < Math.abs(closest - currentMarkValue) ? mark : closest,
  );

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

      <section className="glass relative overflow-hidden rounded-[26px] px-3 py-3">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-sky-400/15 to-transparent" />
        <div className="relative grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveMode("pace");
              triggerHaptic();
            }}
            className={`flex min-h-[132px] flex-col justify-center rounded-[22px] border px-3 py-3 text-left transition duration-200 hover:shadow-[0_18px_36px_rgba(56,189,248,0.12)] active:scale-[0.98] ${
              activeMode === "pace"
                ? "border-sky-300/60 bg-sky-400/12 shadow-[0_18px_36px_rgba(56,189,248,0.14)]"
                : introHighlight === "pace"
                  ? "border-sky-300/45 bg-sky-400/10 shadow-[0_14px_30px_rgba(56,189,248,0.10)]"
                  : "theme-soft hover:bg-sky-400/8"
            }`}
          >
            <p
              className={`text-xs uppercase tracking-[0.18em] ${
                activeMode === "pace" ? "text-sky-300" : "theme-muted"
              }`}
            >
              현재 페이스
            </p>
            <p
              className={`mt-1.5 flex flex-wrap items-baseline gap-x-1 tracking-tight ${
                activeMode === "pace"
                  ? "text-5xl font-black text-sky-200"
                  : "text-[2rem] font-semibold text-[var(--text)]"
              }`}
            >
              <span>{currentPaceValue}</span>
              <span className="shrink-0 text-[0.45em] font-semibold leading-[1.05] theme-muted">
                /km
              </span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode("speed");
              triggerHaptic();
            }}
            className={`flex min-h-[132px] flex-col justify-center rounded-[22px] border px-3 py-3 text-left transition duration-200 hover:shadow-[0_18px_36px_rgba(34,197,94,0.10)] active:scale-[0.98] ${
              activeMode === "speed"
                ? "border-emerald-300/60 bg-emerald-400/10 shadow-[0_18px_36px_rgba(34,197,94,0.12)]"
                : introHighlight === "speed"
                  ? "border-emerald-300/45 bg-emerald-400/8 shadow-[0_14px_30px_rgba(34,197,94,0.09)]"
                  : "theme-soft hover:bg-emerald-400/8"
            }`}
          >
            <p
              className={`text-xs uppercase tracking-[0.18em] ${
                activeMode === "speed" ? "text-emerald-300" : "theme-muted"
              }`}
            >
              현재 속도
            </p>
            <p
              className={`mt-1.5 flex flex-wrap items-baseline gap-x-1 tracking-tight ${
                activeMode === "speed"
                  ? "text-5xl font-black text-emerald-300"
                  : "text-[2rem] font-semibold text-[var(--text)]"
              }`}
            >
              <span>{formatSpeed(currentSpeed)}</span>
              <span className="shrink-0 text-[0.42em] font-semibold leading-[1.05] theme-muted">
                km/h
              </span>
            </p>
          </button>
        </div>
        <p className="theme-muted relative mt-2 px-1 text-center text-[11px]">
          속도와 페이스를 눌러 바꿔보세요
        </p>
      </section>

      <section className="glass mt-3 rounded-[24px] px-4 py-3">
        <p className="theme-muted text-[11px]">예상 완주 시간</p>
        <p className="mt-1 text-sm font-medium theme-text">
          10km 약 <span className="font-bold text-sky-300">{estimated10k}</span>
          <span className="mx-2 theme-muted">/</span>
          하프 약 <span className="font-bold text-emerald-300">{estimatedHalf}</span>
        </p>
      </section>

      <section className="glass mt-4 rounded-[24px] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold theme-text">{sliderLabel}</p>
          <span className="theme-soft rounded-full border px-3 py-1 text-sm font-semibold text-sky-300">
            {sliderValueLabel}
          </span>
        </div>

        <div className="mt-3">
          <input
            id={activeMode === "speed" ? "speed-slider" : "pace-slider"}
            type="range"
            min={0}
            max={SLIDER_MAX}
            step="1"
            value={sliderPosition}
            onChange={(event) => handleSliderChange(event.target.value)}
          />
        </div>

        <div className="mt-1.5 grid grid-cols-7 gap-1 text-center">
          {activeMarks.map((mark, index) => {
            const active = mark === nearestMark;
            const sizeClass =
              index === 0 || index === activeMarks.length - 1
                ? "text-[10px]"
                : index === 2 || index === 3 || index === 4
                  ? "text-sm"
                  : "text-xs";

            return (
              <button
                key={mark}
                type="button"
                onClick={() => {
                  if (activeMode === "speed") {
                    updateFromSliderPosition(positionFromSpeed(mark), "speed");
                  } else {
                    updateFromSliderPosition(positionFromSpeed(SPEED_MARKS[index]), "pace");
                  }
                  triggerHaptic();
                }}
                className={`min-h-12 rounded-2xl px-1 py-2 font-semibold transition ${sizeClass} ${
                  active
                    ? activeMode === "speed"
                      ? "bg-emerald-400/18 text-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.18)] ring-1 ring-emerald-300/30"
                      : "bg-sky-400/18 text-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.18)] ring-1 ring-sky-300/30"
                    : index === 0 || index === activeMarks.length - 1
                      ? "theme-muted-soft hover:bg-sky-100/60"
                      : "theme-muted hover:bg-sky-100/60"
                }`}
              >
                {activeMode === "speed" ? mark : formatPaceSeconds(mark).replace(" /km", "")}
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass mt-4 rounded-[22px] px-3 py-1.5">
        <button
          type="button"
          onClick={() => setShowPrecisionInput((current) => !current)}
          className="flex w-full items-center justify-between px-2 py-0.5 text-left"
        >
          <span className="flex items-center gap-1.5 text-sm font-medium theme-muted">
            <span>정밀 입력</span>
            <span
              className={`inline-block text-[11px] transition-transform duration-200 ${
                showPrecisionInput ? "rotate-0" : "-rotate-90"
              }`}
              aria-hidden="true"
            >
              ▼
            </span>
          </span>
          <span className="theme-muted-soft text-[11px]">{activeMode === "speed" ? "속도" : "페이스"}</span>
        </button>

        {showPrecisionInput ? (
          <div className="mt-2.5">
            {activeMode === "speed" ? (
              <div>
                <div className="mt-1.5 flex items-center rounded-lg border border-white/8 bg-black/5 px-3 py-1.5 shadow-none">
                  <input
                    id="speed-input"
                    inputMode="decimal"
                    type="number"
                    step="0.1"
                    min={MIN_SPEED}
                    max={MAX_SPEED}
                    value={speedInput}
                    onChange={(event) => handleSpeedInputChange(event.target.value)}
                    className="w-full bg-transparent text-lg font-semibold theme-text outline-none placeholder:text-[var(--muted-soft)]"
                    placeholder="9.0"
                  />
                  <span className="theme-muted ml-2 text-sm font-medium">km/h</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2.5">
                  <input
                    inputMode="numeric"
                    type="number"
                    min="4"
                    value={paceMinutesInput}
                    onChange={(event) =>
                      handlePaceInputChange(event.target.value, paceSecondsInput)
                    }
                    className="min-w-0 rounded-lg border border-white/8 bg-black/5 px-3 py-1.5 text-center text-lg font-semibold theme-text outline-none shadow-none placeholder:text-[var(--muted-soft)]"
                    placeholder="6"
                    aria-label="페이스 분"
                  />
                  <span className="theme-muted text-lg font-semibold">:</span>
                  <input
                    inputMode="numeric"
                    type="number"
                    min="0"
                    max="59"
                    value={paceSecondsInput}
                    onChange={(event) =>
                      handlePaceInputChange(paceMinutesInput, event.target.value)
                    }
                    className="min-w-0 rounded-lg border border-white/8 bg-black/5 px-3 py-1.5 text-center text-lg font-semibold theme-text outline-none shadow-none placeholder:text-[var(--muted-soft)]"
                    placeholder="40"
                    aria-label="페이스 초"
                  />
                  <span className="theme-muted text-sm font-medium">/km</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </section>

      <div className="mt-4 min-h-6 px-1 text-sm text-rose-400 dark:text-rose-300">
        {error}
      </div>

      <footer className="theme-muted mt-auto px-1 pt-4 text-sm leading-6">
        같은 슬라이더 위치를 유지한 채 speed와 pace 기준을 전환할 수 있습니다.
      </footer>
    </main>
  );
}
