const MIN_SPEED = 6;
const MAX_SPEED = 18;
const MIN_PACE_SLIDER_SECONDS = 200;
const MAX_PACE_SLIDER_SECONDS = 600;

export type PaceParts = {
  minutes: number;
  seconds: number;
};

export type ConversionSnapshot = {
  speed: number;
  pace: PaceParts;
  paceSeconds: number;
  paceValue: string;
  paceLabel: string;
  estimated10k: string;
  estimatedHalf: string;
};

const conversionSnapshotCache = new Map<string, ConversionSnapshot>();
const paceMarkLabelCache = new Map<number, string>();

function toSpeedCacheKey(speed: number): string {
  return clampSpeed(speed).toFixed(4);
}

export function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed)) {
    return MIN_SPEED;
  }

  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, speed));
}

export function sanitizeSeconds(seconds: number): number {
  if (!Number.isFinite(seconds)) {
    return 0;
  }

  return Math.min(59, Math.max(0, Math.floor(seconds)));
}

export function clampPaceSliderSeconds(totalSeconds: number): number {
  if (!Number.isFinite(totalSeconds)) {
    return MAX_PACE_SLIDER_SECONDS;
  }

  return Math.min(
    MAX_PACE_SLIDER_SECONDS,
    Math.max(MIN_PACE_SLIDER_SECONDS, Math.round(totalSeconds)),
  );
}

export function paceFromSpeed(speedKmh: number): PaceParts {
  const safeSpeed = clampSpeed(speedKmh);
  const totalMinutes = 60 / safeSpeed;
  const wholeMinutes = Math.floor(totalMinutes);
  const rawSeconds = Math.round((totalMinutes - wholeMinutes) * 60);

  if (rawSeconds === 60) {
    return {
      minutes: wholeMinutes + 1,
      seconds: 0,
    };
  }

  return {
    minutes: wholeMinutes,
    seconds: rawSeconds,
  };
}

export function pacePartsFromTotalSeconds(totalSeconds: number): PaceParts {
  const safeTotalSeconds = Math.max(0, Math.round(totalSeconds));

  return {
    minutes: Math.floor(safeTotalSeconds / 60),
    seconds: safeTotalSeconds % 60,
  };
}

export function paceSecondsFromSpeed(speedKmh: number): number {
  const pace = paceFromSpeed(speedKmh);

  return pace.minutes * 60 + pace.seconds;
}

export function getConversionSnapshot(speedKmh: number): ConversionSnapshot {
  const safeSpeed = clampSpeed(speedKmh);
  const cacheKey = toSpeedCacheKey(safeSpeed);
  const cached = conversionSnapshotCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const pace = paceFromSpeed(safeSpeed);
  const paceSeconds = pace.minutes * 60 + pace.seconds;
  const snapshot = {
    speed: safeSpeed,
    pace,
    paceSeconds,
    paceValue: `${pace.minutes}:${String(pace.seconds).padStart(2, "0")}`,
    paceLabel: formatPace(pace.minutes, pace.seconds),
    estimated10k: formatEstimatedDuration(paceSeconds * 10),
    estimatedHalf: formatEstimatedDuration(paceSeconds * 21.1),
  };

  conversionSnapshotCache.set(cacheKey, snapshot);
  return snapshot;
}

export function speedFromPace(minutes: number, seconds: number): number | null {
  if (!Number.isFinite(minutes) || minutes < 0) {
    return null;
  }

  const safeSeconds = sanitizeSeconds(seconds);
  const totalMinutes = minutes + safeSeconds / 60;

  if (totalMinutes <= 0) {
    return null;
  }

  return 60 / totalMinutes;
}

export function speedFromPaceSeconds(totalSeconds: number): number | null {
  const pace = pacePartsFromTotalSeconds(totalSeconds);
  return speedFromPace(pace.minutes, pace.seconds);
}

export function formatPace(minutes: number, seconds: number): string {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const safeSeconds = sanitizeSeconds(seconds);

  return `${safeMinutes}:${String(safeSeconds).padStart(2, "0")} /km`;
}

export function formatPaceSeconds(totalSeconds: number): string {
  const pace = pacePartsFromTotalSeconds(totalSeconds);
  return formatPace(pace.minutes, pace.seconds);
}

export function getPaceMarkLabel(totalSeconds: number): string {
  const safeTotalSeconds = Math.max(0, Math.round(totalSeconds));
  const cached = paceMarkLabelCache.get(safeTotalSeconds);

  if (cached) {
    return cached;
  }

  const label = formatPaceSeconds(safeTotalSeconds).replace(" /km", "");
  paceMarkLabelCache.set(safeTotalSeconds, label);
  return label;
}

export function formatEstimatedDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "--";
  }

  const roundedMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;

  if (hours < 1) {
    return `${roundedMinutes}분`;
  }

  if (minutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
}

export function formatSpeed(speed: number): string {
  if (!Number.isFinite(speed) || speed <= 0) {
    return "--";
  }

  return speed.toFixed(1);
}

export function parseDecimalInput(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function parseIntegerInput(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.floor(parsed);
}

export function warmPaceCache({
  speeds = [],
  paceSeconds = [],
}: {
  speeds?: number[];
  paceSeconds?: number[];
} = {}): void {
  speeds.forEach((speed) => {
    getConversionSnapshot(speed);
  });

  paceSeconds.forEach((seconds) => {
    getPaceMarkLabel(seconds);
  });
}

export { MAX_PACE_SLIDER_SECONDS, MAX_SPEED, MIN_PACE_SLIDER_SECONDS, MIN_SPEED };
