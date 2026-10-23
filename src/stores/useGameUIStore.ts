import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { CardDto } from "@/protocol/game";
import type { DeckCard } from "@/protocol/deck";
import type { Prompt } from "@/protocol";
import type { LevelUpKind, PlayCardMode } from "@/protocol/prompts/common";
import type { ZoneLocation, ZoneViewMode } from "@/lib/zoneView";
import type { CardBrowserState } from "@/components/game/modals/cardBrowser";

export interface HandActionOption {
  kind: "cast" | "ability" | "manual-move" | "manual-tap";
  cardId: string;
  label: string;
  abilityText?: string;
  actionId?: string;
  mode?: PlayCardMode;
  faceIndex?: number;
  abilityIndex?: number;
  isManaAbility?: boolean;
  levelUp?: LevelUpKind;
  cost?: string;
  displayManaLetters?: string[];
  colorChoice?: string;
  toZoneId?: string;
  tapped?: boolean;
}

export interface AbilityPickerState {
  cardId: string;
  card?: DeckCard;
  promptId: Prompt["promptId"];
  source: CardDto;
  abilities: HandActionOption[];
}

export interface PlayModePickerState {
  cardId: string;
  card: DeckCard;
  options: HandActionOption[];
  promptId: Prompt["promptId"];
  source: CardDto;
}

export interface ViewingZoneState {
  title: string;
  cards: CardDto[];
  mode: ZoneViewMode;
  source?: ZoneLocation;
  promptId?: number;
  onClickCard?: (cardId: string) => void;
  clickableCardIds?: string[];
  selectedCardIds?: string[];
  clickLabel?: string;
  selectedLabel?: string;
  /** Prompt type this viewer serves. While set, the viewer stays open across
   *  same-type re-prompts (e.g. picking the 2nd of N targets) and only closes
   *  once the active prompt changes type or ends. */
  stickyPromptType?: string;
  targetHostile?: boolean;
}

interface GameUIState {
  // Modal states (all transient, not persisted)
  abilityPicker: AbilityPickerState | null;
  playModePicker: PlayModePickerState | null;
  viewingZone: ViewingZoneState | null;
  isActionPanelCollapsed: boolean;
  rightPanelTab: "log" | "snapshots" | "dev";
  unreadAutoResolutionCount: number;
  promptModalHidden: boolean;
  zoneBrowserStates: Record<string, CardBrowserState>;
  mobileHandState: { promptId: Prompt["promptId"] | null; open: boolean };
  mobilePanel: "phases" | null;
  setMobileHandState: (state: { promptId: Prompt["promptId"] | null; open: boolean }) => void;
  setMobilePanel: (panel: "phases" | null) => void;
  saveZoneBrowserState: (key: string, state: CardBrowserState) => void;

  openAbilityPicker: (state: AbilityPickerState) => void;
  closeAbilityPicker: () => void;
  openPlayModePicker: (state: PlayModePickerState) => void;
  closePlayModePicker: () => void;
  openZoneViewer: (state: ViewingZoneState) => void;
  closeZoneViewer: () => void;
  toggleActionPanel: () => void;
  setActionPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelTab: (tab: "log" | "snapshots" | "dev") => void;
  notifyAutoResolution: () => void;
  resetUnreadAutoResolutions: () => void;
  toggleDevPanel: () => void;
  hidePromptModal: () => void;
  showPromptModal: () => void;
  resetAll: () => void;
}

export const useGameUIStore = create<GameUIState>()(
  devtools(
    (set) => ({
      abilityPicker: null,
      playModePicker: null,
      viewingZone: null,
      isActionPanelCollapsed: true,
      rightPanelTab: "log",
      unreadAutoResolutionCount: 0,
      promptModalHidden: false,
      zoneBrowserStates: {},
      mobileHandState: { promptId: null, open: false },
      mobilePanel: null,
      setMobileHandState: (mobileHandState) => set({ mobileHandState }),
      setMobilePanel: (mobilePanel) => set({ mobilePanel }),
      saveZoneBrowserState: (key, state) =>
        set((current) => ({ zoneBrowserStates: { ...current.zoneBrowserStates, [key]: state } })),

      openAbilityPicker: (state) => set({ abilityPicker: state }),
      closeAbilityPicker: () => set({ abilityPicker: null }),

      openPlayModePicker: (state) => set({ playModePicker: state }),
      closePlayModePicker: () => set({ playModePicker: null }),

      openZoneViewer: (state) => set({ viewingZone: state }),
      closeZoneViewer: () => set({ viewingZone: null }),

      toggleActionPanel: () =>
        set((state) => ({
          isActionPanelCollapsed: !state.isActionPanelCollapsed,
          ...(state.isActionPanelCollapsed && state.rightPanelTab === "log"
            ? { unreadAutoResolutionCount: 0 }
            : {}),
        })),
      setActionPanelCollapsed: (collapsed) =>
        set((state) => ({
          isActionPanelCollapsed: collapsed,
          ...(collapsed || state.rightPanelTab !== "log" ? {} : { unreadAutoResolutionCount: 0 }),
        })),
      setRightPanelTab: (tab) =>
        set((state) => ({
          rightPanelTab: tab,
          ...(tab === "log" && !state.isActionPanelCollapsed
            ? { unreadAutoResolutionCount: 0 }
            : {}),
        })),
      notifyAutoResolution: () =>
        set((state) =>
          !state.isActionPanelCollapsed && state.rightPanelTab === "log"
            ? {}
            : { unreadAutoResolutionCount: state.unreadAutoResolutionCount + 1 },
        ),
      resetUnreadAutoResolutions: () => set({ unreadAutoResolutionCount: 0 }),
      toggleDevPanel: () => {
        if (!import.meta.env.DEV) return;
        set((state) =>
          state.rightPanelTab === "dev" && !state.isActionPanelCollapsed
            ? { isActionPanelCollapsed: true }
            : { isActionPanelCollapsed: false, rightPanelTab: "dev" },
        );
      },
      hidePromptModal: () => set({ promptModalHidden: true }),
      showPromptModal: () => set({ promptModalHidden: false, viewingZone: null }),

      resetAll: () =>
        set({
          abilityPicker: null,
          playModePicker: null,
          viewingZone: null,
          isActionPanelCollapsed: true,
          promptModalHidden: false,
          zoneBrowserStates: {},
          mobileHandState: { promptId: null, open: false },
          mobilePanel: null,
          unreadAutoResolutionCount: 0,
        }),
    }),
    { name: "gameUI", enabled: import.meta.env.DEV },
  ),
);
