import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sanitizeObject<T>(obj: any): T {
    if (!obj) return obj;
    // Ensure it's a plain object, not a Mongoose document
    const plainObject = JSON.parse(JSON.stringify(obj));
    return plainObject as T;
}
