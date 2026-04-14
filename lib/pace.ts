const MIN_SPEED = 6;
const MAX_SPEED = 18;

export type PaceParts = {
  minutes: number;
  seconds: number;
};

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

export function formatPace(minutes: number, seconds: number): string {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const safeSeconds = sanitizeSeconds(seconds);

  return `${safeMinutes}:${String(safeSeconds).padStart(2, "0")} /km`;
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

export { MAX_SPEED, MIN_SPEED };
