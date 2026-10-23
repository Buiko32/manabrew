import { useState } from "react";
import { useLingui } from "@lingui/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ManaSymbols } from "@/components/game/ManaSymbols";
import { useLongPressPreview } from "@/hooks/useLongPressPreview";
import { resolveCardKeyword } from "@/lib/cardKeywords";
import { cn } from "@/lib/utils";

export function KeywordLabel({ keyword, maxLength }: { keyword: string; maxLength?: number }) {
  const { i18n } = useLingui();
  const resolved = resolveCardKeyword(keyword, undefined, i18n);
  return (
    <>
      <span className="truncate">
        {maxLength != null && resolved.label.length > maxLength
          ? `${resolved.label.slice(0, maxLength - 1)}…`
          : resolved.label}
      </span>
      {resolved.manaCost ? (
        <ManaSymbols cost={resolved.manaCost} size="sm" />
      ) : resolved.parameter && resolved.name !== "Flashback" ? (
        <span className="normal-case"> {resolved.parameter}</span>
      ) : null}
    </>
  );
}

export function KeywordHelp({
  keyword,
  children,
  className,
  style,
}: {
  keyword: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { i18n } = useLingui();
  const resolved = resolveCardKeyword(keyword, undefined, i18n);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [held, setHeld] = useState(false);
  const longPress = useLongPressPreview<string>({
    resolve: (event) =>
      resolved.description ? { item: keyword, anchor: event.currentTarget as HTMLElement } : null,
    show: () => setHeld(true),
    hide: () => setHeld(false),
  });
  const open = Boolean(resolved.description) && (hovered || focused || held);

  return (
    <Tooltip open={open}>
      <TooltipTrigger asChild>
        <span
          className={cn(className, resolved.description && "cursor-help")}
          style={style}
          tabIndex={resolved.description ? 0 : undefined}
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch" && resolved.description) setHovered(true);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType !== "touch") setHovered(false);
          }}
          onFocus={(event) =>
            resolved.description &&
            event.currentTarget.matches(":focus-visible") &&
            setFocused(true)
          }
          onBlur={() => setFocused(false)}
          onPointerDownCapture={(event) => {
            if (event.pointerType === "touch") {
              longPress.onPointerDown(event);
              event.stopPropagation();
            }
          }}
          onPointerMove={longPress.onPointerMove}
          onPointerUp={longPress.onPointerUp}
          onPointerCancel={longPress.onPointerCancel}
          onClickCapture={(event) => {
            event.stopPropagation();
            longPress.onClickCapture(event);
          }}
          onContextMenu={longPress.onContextMenu}
        >
          {children}
        </span>
      </TooltipTrigger>
      {resolved.description && (
        <TooltipContent
          className="pointer-events-none z-[10002] max-w-60 whitespace-normal text-left normal-case"
          side="top"
        >
          <span className="font-semibold">{resolved.label}</span>
          <span className="block pt-1">{resolved.description}</span>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
