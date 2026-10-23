import type { Container, FederatedPointerEvent } from "pixi.js";
import { LongPressGesture } from "@/pixi/LongPressGesture";

let tooltip: HTMLDivElement | null = null;
let title: HTMLDivElement | null = null;
let description: HTMLDivElement | null = null;
let owner: object | null = null;

function createTooltip(): void {
  if (tooltip) return;
  tooltip = document.createElement("div");
  tooltip.className =
    "fixed z-[10002] pointer-events-none max-w-60 rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md";
  title = document.createElement("div");
  title.className = "font-semibold";
  description = document.createElement("div");
  description.className = "pt-1 whitespace-normal text-left";
  tooltip.append(title, description);
  document.body.append(tooltip);
}

export function showKeywordTooltip(
  nextOwner: object,
  label: string,
  definition: string,
  x: number,
  y: number,
): void {
  createTooltip();
  owner = nextOwner;
  title!.textContent = label;
  description!.textContent = definition;
  const bounds = tooltip!.getBoundingClientRect();
  const left = Math.max(8, Math.min(x + 12, window.innerWidth - bounds.width - 8));
  const above = y - bounds.height - 12;
  const top = above >= 8 ? above : Math.min(y + 12, window.innerHeight - bounds.height - 8);
  tooltip!.style.left = `${left}px`;
  tooltip!.style.top = `${top}px`;
  tooltip!.style.visibility = "visible";
}

export function hideKeywordTooltip(requestedOwner?: object): void {
  if (requestedOwner && owner !== requestedOwner) return;
  tooltip?.remove();
  tooltip = null;
  title = null;
  description = null;
  owner = null;
}
const cleanups = new Map<object, Set<() => void>>();
const cancellations = new Map<object, Set<() => void>>();

export function bindPixiKeywordTooltip(
  chip: Container,
  owner: object,
  key: string,
  label: string,
  definition: string,
): void {
  const gesture = new LongPressGesture();
  let pointerId: number | null = null;
  let fired = false;
  const cancel = () => {
    gesture.reset();
    pointerId = null;
    if (fired) hideKeywordTooltip(owner);
    fired = false;
  };
  const onPointerCancel = (event: PointerEvent) => {
    if (event.pointerId === pointerId) cancel();
  };
  const onBlur = () => cancel();
  const onDown = (event: FederatedPointerEvent) => {
    if (event.pointerType !== "touch") return;
    pointerId = event.pointerId;
    gesture.start(event, key, () => {
      fired = true;
      showKeywordTooltip(owner, label, definition, event.clientX, event.clientY);
    });
  };
  const onMove = (event: FederatedPointerEvent) => {
    if (event.pointerId === pointerId) gesture.move(event.global.x, event.global.y);
  };
  const onEnd = (event: FederatedPointerEvent) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    gesture.cancel();
    gesture.releaseFired();
    if (fired) hideKeywordTooltip(owner);
    fired = false;
  };
  const onTap = (event: FederatedPointerEvent) => {
    event.stopPropagation();
    if (gesture.consumeTap(key)) event.preventDefault();
  };
  const onEnter = (event: FederatedPointerEvent) => {
    if (event.pointerType !== "touch")
      showKeywordTooltip(owner, label, definition, event.clientX, event.clientY);
  };
  const onLeave = (event: FederatedPointerEvent) => {
    if (event.pointerType !== "touch") hideKeywordTooltip(owner);
  };
  chip.on("pointerdown", onDown);
  chip.on("globalpointermove", onMove);
  chip.on("pointerup", onEnd);
  chip.on("pointerupoutside", onEnd);
  chip.on("pointertap", onTap);
  chip.on("pointerenter", onEnter);
  chip.on("pointermove", onEnter);
  chip.on("pointerleave", onLeave);
  window.addEventListener("pointercancel", onPointerCancel);
  window.addEventListener("blur", onBlur);
  const cleanup = () => {
    cancel();
    window.removeEventListener("pointercancel", onPointerCancel);
    window.removeEventListener("blur", onBlur);
    hideKeywordTooltip(owner);
    cleanups.get(owner)?.delete(cleanup);
    cancellations.get(owner)?.delete(cancel);
  };
  const ownerCleanups = cleanups.get(owner) ?? new Set();
  ownerCleanups.add(cleanup);
  cleanups.set(owner, ownerCleanups);
  const ownerCancellations = cancellations.get(owner) ?? new Set();
  ownerCancellations.add(cancel);
  cancellations.set(owner, ownerCancellations);
}

export function cancelPixiKeywordTooltips(owner: object): void {
  for (const cancel of cancellations.get(owner) ?? []) cancel();
  hideKeywordTooltip(owner);
}

export function cleanupPixiKeywordTooltips(owner: object): void {
  for (const cleanup of cleanups.get(owner) ?? []) cleanup();
  cleanups.delete(owner);
  cancellations.delete(owner);
}
