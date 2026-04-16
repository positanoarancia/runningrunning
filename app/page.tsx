"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import {
  MAX_SPEED,
  MIN_SPEED,
  clampPaceSliderSeconds,
  formatSpeed,
  getConversionSnapshot,
  getPaceMarkLabel,
  paceFromSpeed,
  speedFromPace,
  warmPaceCache,
} from "@/lib/pace";

const SPEED_MARKS = [6, 8, 10, 12, 14, 16, 18];
const PACE_MARKS = [600, 450, 360, 300, 257, 225, 200];
const DEFAULT_SPEED = 9;
const DEFAULT_POSITION = Math.round(((DEFAULT_SPEED - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * 1000);
const SLIDER_MAX = 1000;
const SPEED_HAPTIC_STEP = 0.5;
const PACE_HAPTIC_STEP = 15;
const PREFETCH_SPEEDS = [DEFAULT_SPEED, 10, 12];
const PREFETCH_PACE_MARKS = [300, 360, 450];

type ActiveMode = "speed" | "pace";
type ThemeMode = "light" | "dark";
type IdleCallbackHandle = number;
type IdleCallbackHost = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

function triggerHaptic() {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }

  navigator.vibrate(10);
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.2" />
      <path d="M12 19.8V22" />
      <path d="m4.93 4.93 1.56 1.56" />
      <path d="m17.51 17.51 1.56 1.56" />
      <path d="M2 12h2.2" />
      <path d="M19.8 12H22" />
      <path d="m4.93 19.07 1.56-1.56" />
      <path d="m17.51 6.49 1.56-1.56" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M20.9 14.1A8.6 8.6 0 1 1 9.9 3.1 6.7 6.7 0 0 0 20.9 14.1Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <circle cx="18" cy="5" r="2.2" />
      <circle cx="6" cy="12" r="2.2" />
      <circle cx="18" cy="19" r="2.2" />
      <path d="M8 11 16 6.2" />
      <path d="m8 13 8 4.8" />
    </svg>
  );
}

export default function HomePage() {
  const [activeMode, setActiveMode] = useState<ActiveMode>("speed");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [sliderPosition, setSliderPosition] = useState<number>(DEFAULT_POSITION);
  const [introHighlight, setIntroHighlight] = useState<ActiveMode | null>(null);
  const [error, setError] = useState<string>("");
  const [shareNotice, setShareNotice] = useState<string>("");
  const lastSpeedHapticMark = useRef<number | null>(null);
  const lastPaceHapticMark = useRef<number | null>(null);
  const shareNoticeTimeout = useRef<number | null>(null);

  const applyTheme = (nextTheme: ThemeMode) => {
    setThemeMode(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("theme-mode", nextTheme);
  };

  const toggleTheme = () => {
    const currentTheme =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    applyTheme(currentTheme === "dark" ? "light" : "dark");
  };

  const showShareNotice = () => {
    setShareNotice("링크가 복사되었습니다");

    if (shareNoticeTimeout.current !== null) {
      window.clearTimeout(shareNoticeTimeout.current);
    }

    shareNoticeTimeout.current = window.setTimeout(() => {
      setShareNotice("");
    }, 2200);
  };

  const copyCurrentUrl = async (url: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      showShareNotice();
    } catch {
      setShareNotice("링크 복사에 실패했습니다");
    }
  };

  const handleShare = async () => {
    const sharePayload = {
      title: "러닝 페이스 계산기",
      text: "러닝머신 속도와 페이스를 빠르게 변환해보세요.",
      url: window.location.href,
    };

    if (typeof navigator.share === "function") {
      try {
        await navigator.share(sharePayload);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    await copyCurrentUrl(sharePayload.url);
  };

  const speedFromPosition = (position: number) =>
    MIN_SPEED + ((MAX_SPEED - MIN_SPEED) * position) / SLIDER_MAX;

  const positionFromSpeed = (speed: number) =>
    Math.round(((speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * SLIDER_MAX);

  const currentSpeed = speedFromPosition(sliderPosition);
  const currentSnapshot = getConversionSnapshot(currentSpeed);
  const currentPace = currentSnapshot.pace;
  const currentPaceSeconds = currentSnapshot.paceSeconds;
  const currentPaceValue = currentSnapshot.paceValue;
  const currentPaceLabel = currentSnapshot.paceLabel;
  const estimated10k = currentSnapshot.estimated10k;
  const estimatedHalf = currentSnapshot.estimatedHalf;

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme-mode");
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    applyTheme(initialTheme);
  }, []);

  useEffect(() => {
    return () => {
      if (shareNoticeTimeout.current !== null) {
        window.clearTimeout(shareNoticeTimeout.current);
      }
    };
  }, []);

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

  useEffect(() => {
    const warm = () => {
      warmPaceCache({
        speeds: PREFETCH_SPEEDS,
        paceSeconds: PREFETCH_PACE_MARKS,
      });
    };

    if (typeof window === "undefined") {
      return;
    }

    const idleHost = window as IdleCallbackHost;

    if (typeof idleHost.requestIdleCallback === "function") {
      const idleId = idleHost.requestIdleCallback(() => warm(), { timeout: 1200 });

      return () => {
        idleHost.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = window.setTimeout(warm, 180);
    return () => {
      window.clearTimeout(timeoutId);
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

  const nudgeSlider = (direction: -1 | 1) => {
    if (activeMode === "speed") {
      const nextSpeed = Math.min(
        MAX_SPEED,
        Math.max(MIN_SPEED, Math.round((currentSpeed + direction * 0.1) * 10) / 10),
      );
      maybeTriggerSpeedHaptic(nextSpeed);
      updateFromSliderPosition(positionFromSpeed(nextSpeed), "speed");
      triggerHaptic();
      return;
    }

    const nextPaceSeconds = clampPaceSliderSeconds(currentPaceSeconds - direction * 5);
    const nextSpeed = speedFromPace(
      Math.floor(nextPaceSeconds / 60),
      nextPaceSeconds % 60,
    );

    if (nextSpeed === null) {
      return;
    }

    maybeTriggerPaceHaptic(nextPaceSeconds);
    updateFromSliderPosition(positionFromSpeed(nextSpeed), "pace");
    triggerHaptic();
  };

  const sliderLabel = activeMode === "speed" ? "속도 슬라이더" : "페이스 슬라이더";
  const sliderValueLabel =
    activeMode === "speed" ? `${formatSpeed(currentSpeed)} km/h` : currentPaceLabel;
  const currentMarkValue = activeMode === "speed" ? currentSpeed : currentPace.minutes * 60 + currentPace.seconds;
  const activeMarks = activeMode === "speed" ? SPEED_MARKS : PACE_MARKS;
  const nearestMark = activeMarks.reduce((closest, mark) =>
    Math.abs(mark - currentMarkValue) < Math.abs(closest - currentMarkValue) ? mark : closest,
  );
  const sliderProgress = `${(sliderPosition / SLIDER_MAX) * 100}%`;
  const sliderAccent = activeMode === "speed" ? "var(--accent)" : "var(--primary)";
  const sliderStyle = {
    background: `linear-gradient(90deg, ${sliderAccent} 0%, ${sliderAccent} ${sliderProgress}, var(--slider-track) ${sliderProgress}, var(--slider-track) 100%)`,
    "--thumb-border":
      activeMode === "speed"
        ? "color-mix(in srgb, var(--accent) 28%, white)"
        : "color-mix(in srgb, var(--primary) 28%, white)",
    "--thumb-fill-start": activeMode === "speed" ? "var(--accent)" : "var(--primary)",
    "--thumb-fill-end":
      activeMode === "speed"
        ? "color-mix(in srgb, var(--accent) 84%, black)"
        : "var(--primary-strong)",
  } as CSSProperties;

  const faqItems = [
    {
      question: "11km/h는 몇 분 페이스인가요?",
      answer:
        "11km/h는 약 5분 27초/km 페이스입니다. 계산식은 60 ÷ 11로 약 5.45분, 즉 5:27/km입니다.",
    },
    {
      question: "5:30/km는 몇 km/h인가요?",
      answer:
        "5:30/km는 약 10.9km/h입니다. 5분 30초는 5.5분이므로 60 ÷ 5.5 = 약 10.91km/h입니다.",
    },
    {
      question: "10km를 50분에 뛰려면 몇 페이스인가요?",
      answer:
        "10km를 50분에 완주하려면 평균 5:00/km 페이스가 필요합니다. 50분을 10km로 나누면 1km당 5분입니다.",
    },
  ];

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-10 pt-6 theme-text">
      <header className="mb-5 px-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="theme-accent-blue text-xs font-medium uppercase tracking-[0.24em]">
              by 러닝러닝
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight theme-text">
              러닝 페이스 계산기
            </h1>
            <h2 className="theme-muted mt-2 text-sm leading-6 font-medium">
              러닝머신 속도 ↔ 페이스 변환
            </h2>
          </div>
          <div className="mt-1 flex items-start justify-end gap-2.5">
            <button
              type="button"
              aria-label="공유하기"
              onClick={handleShare}
              className="theme-muted rounded-md p-1 opacity-70 transition hover:opacity-95 hover:text-[var(--text)] active:scale-95 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              <ShareIcon />
            </button>
            <button
              type="button"
              aria-label={themeMode === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
              onClick={toggleTheme}
              className="theme-muted rounded-md p-1 opacity-70 transition hover:opacity-95 hover:text-[var(--text)] active:scale-95 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            >
              {themeMode === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
        {shareNotice ? (
          <p className="theme-muted mt-2 px-1 text-right text-xs" role="status" aria-live="polite">
            {shareNotice}
          </p>
        ) : null}
      </header>

      <section className="glass relative overflow-hidden rounded-[26px] p-5">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[color:color-mix(in_srgb,var(--primary)_10%,transparent)] to-transparent" />
        <div className="relative grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveMode("pace");
              triggerHaptic();
            }}
            className={`flex min-h-[124px] flex-col justify-center rounded-[22px] border px-4 pr-5 py-4 text-left transition duration-200 hover:shadow-[0_18px_36px_rgba(56,189,248,0.12)] active:scale-[0.98] ${
              activeMode === "pace"
                ? "theme-accent-blue-soft shadow-[0_18px_36px_rgba(37,99,235,0.10)]"
                : introHighlight === "pace"
                  ? "theme-accent-blue-soft shadow-[0_14px_30px_rgba(37,99,235,0.08)]"
                  : "theme-soft hover:bg-[color:color-mix(in_srgb,var(--primary)_6%,transparent)]"
            }`}
          >
            <p
              className={`text-xs uppercase tracking-[0.18em] ${
                activeMode === "pace" ? "theme-accent-blue" : "theme-muted"
              }`}
            >
              현재 페이스
            </p>
            <div className="mt-1.5">
              <p
                className={`tracking-tight ${
                  activeMode === "pace"
                    ? "text-5xl font-black theme-accent-blue"
                    : "text-[2rem] font-semibold text-[var(--text)]"
                }`}
              >
                {currentPaceValue}
              </p>
              <p className="mt-1 text-[0.95rem] font-semibold leading-none theme-muted">/km</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode("speed");
              triggerHaptic();
            }}
            className={`flex min-h-[124px] flex-col justify-center rounded-[22px] border px-4 pr-5 py-4 text-left transition duration-200 hover:shadow-[0_18px_36px_rgba(34,197,94,0.10)] active:scale-[0.98] ${
              activeMode === "speed"
                ? "theme-accent-green-soft shadow-[0_18px_36px_rgba(16,185,129,0.10)]"
                : introHighlight === "speed"
                  ? "theme-accent-green-soft shadow-[0_14px_30px_rgba(16,185,129,0.08)]"
                  : "theme-soft hover:bg-[color:color-mix(in_srgb,var(--accent)_6%,transparent)]"
            }`}
          >
            <p
              className={`text-xs uppercase tracking-[0.18em] ${
                activeMode === "speed" ? "theme-accent-green" : "theme-muted"
              }`}
            >
              현재 속도
            </p>
            <div className="mt-1.5">
              <p
                className={`tracking-tight ${
                  activeMode === "speed"
                    ? "text-5xl font-black theme-accent-green"
                    : "text-[2rem] font-semibold text-[var(--text)]"
                }`}
              >
                {formatSpeed(currentSpeed)}
              </p>
              <p className="mt-1 text-[0.95rem] font-semibold leading-none theme-muted">km/h</p>
            </div>
          </button>
        </div>
        <p className="theme-muted relative mt-2 px-1 text-center text-[11px]">
          속도와 페이스를 눌러 바꿔보세요
        </p>
      </section>

      <section className="glass mt-3 rounded-[24px] p-5">
        <p className="theme-muted text-[11px]">예상 완주 시간</p>
        <p className="mt-1 text-sm font-medium theme-text">
          10km 약 <span className="theme-accent-blue font-bold">{estimated10k}</span>
          <span className="mx-2 theme-muted">/</span>
          하프 약 <span className="theme-accent-green font-bold">{estimatedHalf}</span>
        </p>
      </section>

      <section className="glass mt-4 rounded-[24px] p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold theme-text">{sliderLabel}</p>
          <div className="flex items-center gap-2">
            <span className="theme-soft theme-accent-blue rounded-full border px-3 py-1 text-sm font-semibold">
              {sliderValueLabel}
            </span>
            <button
              type="button"
              aria-label={activeMode === "speed" ? "속도 0.1 감소" : "페이스 5초 감소"}
              onClick={() => nudgeSlider(-1)}
              className="theme-muted flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] opacity-70 hover:opacity-100 hover:text-[var(--text)] active:scale-95"
            >
              -
            </button>
            <button
              type="button"
              aria-label={activeMode === "speed" ? "속도 0.1 증가" : "페이스 5초 증가"}
              onClick={() => nudgeSlider(1)}
              className="theme-muted flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] opacity-70 hover:opacity-100 hover:text-[var(--text)] active:scale-95"
            >
              +
            </button>
          </div>
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
            style={sliderStyle}
          />
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1 text-center">
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
                className={`min-h-11 rounded-2xl px-1 py-2 font-semibold transition ${sizeClass} ${
                  active
                    ? activeMode === "speed"
                      ? "theme-accent-green-soft theme-accent-green shadow-[0_0_18px_rgba(16,185,129,0.12)]"
                      : "theme-accent-blue-soft theme-accent-blue shadow-[0_0_18px_rgba(37,99,235,0.12)]"
                    : index === 0 || index === activeMarks.length - 1
                      ? "theme-muted-soft hover:bg-[color:color-mix(in_srgb,var(--primary)_8%,transparent)]"
                      : "theme-muted hover:bg-[color:color-mix(in_srgb,var(--primary)_8%,transparent)]"
                }`}
              >
                {activeMode === "speed" ? mark : getPaceMarkLabel(mark)}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4 min-h-6 px-1 text-sm text-rose-400 dark:text-rose-300">
        {error}
      </div>

      <section className="glass mt-6 rounded-[24px] p-5">
        <h2 className="text-xl font-bold theme-text">러닝 페이스란?</h2>
        <p className="mt-2 text-sm leading-6 theme-muted">
          러닝 페이스는 1km를 달리는 데 걸리는 시간을 뜻합니다. 보통 분:초/km 형식으로
          표시합니다.
        </p>
      </section>

      <section className="glass mt-3 rounded-[24px] p-5">
        <h2 className="text-xl font-bold theme-text">러닝머신 속도와 페이스 변환</h2>
        <p className="mt-2 text-sm leading-6 theme-muted">
          러닝머신은 보통 km/h로 속도를 표시하지만, 러너는 페이스로 기록을 이해하는 경우가
          많습니다. 이 계산기는 속도와 페이스를 서로 빠르게 바꿔줍니다.
        </p>
      </section>

      <section className="glass mt-3 rounded-[24px] p-5">
        <h2 className="text-xl font-bold theme-text">자주 묻는 질문</h2>
        <div className="mt-3 space-y-3">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-xl border border-[var(--border)] p-3">
              <h3 className="text-sm font-semibold theme-text">{item.question}</h3>
              <p className="mt-1 text-sm leading-6 theme-muted">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

    </main>
  );
}
