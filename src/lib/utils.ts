import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I/O/0/1 to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function isSeriesLocked(seriesStartTime: string | null): boolean {
  if (!seriesStartTime) return false;
  const lockTime = new Date(seriesStartTime);
  lockTime.setMinutes(lockTime.getMinutes() - 30);
  return new Date() >= lockTime;
}

export function isGameLocked(gameStartTime: string | null): boolean {
  if (!gameStartTime) return false;
  const lockTime = new Date(gameStartTime);
  lockTime.setMinutes(lockTime.getMinutes() - 30);
  return new Date() >= lockTime;
}

export function timeUntilLock(startTime: string | null): string {
  if (!startTime) return "TBD";
  const lockTime = new Date(startTime);
  lockTime.setMinutes(lockTime.getMinutes() - 30);
  const now = new Date();
  const diff = lockTime.getTime() - now.getTime();
  if (diff <= 0) return "Locked";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}
