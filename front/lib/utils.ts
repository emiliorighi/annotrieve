import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const ENTITY_DETAILS_BASE_PATH = "/annotations/details"

export function buildEntityDetailsUrl(type: "taxon" | "assembly", id: string) {
  const param = type === "taxon" ? "taxon" : "assembly"
  return `${ENTITY_DETAILS_BASE_PATH}?${param}=${encodeURIComponent(id)}`
}
