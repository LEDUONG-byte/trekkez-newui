export const RETURN_WARNING_MINUTES = 30;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export function formatPlanDateTime(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultStartAt(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(5, 30, 0, 0);
  return formatPlanDateTime(date);
}

export function parsePlanDateTime(value?: string | null): Date | null {
  if (!value) return null;
  const normalized = value.trim().replace(',', ' ').replace(/\s+/g, ' ');
  const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    const native = new Date(value);
    return Number.isNaN(native.getTime()) ? null : native;
  }

  const [, dayText, monthText, yearText, hourText, minuteText, secondText] = match;
  const date = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText),
    Number(hourText),
    Number(minuteText),
    Number(secondText ?? 0),
    0,
  );

  if (
    date.getFullYear() !== Number(yearText) ||
    date.getMonth() !== Number(monthText) - 1 ||
    date.getDate() !== Number(dayText) ||
    date.getHours() !== Number(hourText) ||
    date.getMinutes() !== Number(minuteText)
  ) {
    return null;
  }

  return date;
}

export function deriveExpectedReturnAt(
  startAt: string,
  routeDurationSeconds: number,
  safetyBufferMinutes = 30,
): string {
  const start = parsePlanDateTime(startAt);
  if (!start) return '';
  const durationMs = Math.max(0, routeDurationSeconds) * 1000;
  const bufferMs = Math.max(0, safetyBufferMinutes) * 60 * 1000;
  return formatPlanDateTime(new Date(start.getTime() + durationMs + bufferMs));
}

export type ReturnTimeState = {
  valid: boolean;
  overdue: boolean;
  soon: boolean;
  minutesRemaining?: number;
  label: string;
};

export function getReturnTimeState(
  expectedReturnAt?: string,
  nowMs = Date.now(),
  warningMinutes = RETURN_WARNING_MINUTES,
): ReturnTimeState {
  const target = parsePlanDateTime(expectedReturnAt);
  if (!target) return { valid: false, overdue: false, soon: false, label: 'Chưa đặt giờ quay về' };

  const deltaMinutes = Math.ceil((target.getTime() - nowMs) / 60000);
  if (deltaMinutes < 0) {
    const overdueMinutes = Math.abs(deltaMinutes);
    return {
      valid: true,
      overdue: true,
      soon: false,
      minutesRemaining: deltaMinutes,
      label: `Đã quá ${formatMinutesCompact(overdueMinutes)}`,
    };
  }

  return {
    valid: true,
    overdue: false,
    soon: deltaMinutes <= warningMinutes,
    minutesRemaining: deltaMinutes,
    label: deltaMinutes === 0 ? 'Đến giờ quay về' : `Còn ${formatMinutesCompact(deltaMinutes)}`,
  };
}

export function formatMinutesCompact(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (hours <= 0) return `${remainder} phút`;
  if (remainder === 0) return `${hours} giờ`;
  return `${hours}g ${remainder}p`;
}

export function validateTripWindow(startAt: string, expectedReturnAt?: string): string | null {
  const start = parsePlanDateTime(startAt);
  const end = parsePlanDateTime(expectedReturnAt);
  if (!start) return 'Thời gian bắt đầu chưa đúng định dạng DD/MM/YYYY HH:mm.';
  if (!end) return 'Giờ quay về dự kiến chưa đúng định dạng DD/MM/YYYY HH:mm.';
  if (end.getTime() <= start.getTime()) return 'Giờ quay về phải sau thời gian bắt đầu.';
  return null;
}
