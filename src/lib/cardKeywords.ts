import { msg } from "@lingui/core/macro";
import { i18n } from "@/i18n/i18n";
import { MANA_CODE_SET, type ManaCode } from "@/types/scryfall";

const KEYWORDS = {
  Flying: [msg`Flying`, msg`This creature can be blocked only by creatures with flying or reach.`],
  "First strike": [
    msg`First strike`,
    msg`This creature deals combat damage before creatures without first strike or double strike.`,
  ],
  "Double strike": [
    msg`Double strike`,
    msg`This creature deals both first-strike and regular combat damage.`,
  ],
  Vigilance: [msg`Vigilance`, msg`Attacking doesn't cause this creature to tap.`],
  Trample: [
    msg`Trample`,
    msg`This creature can assign excess combat damage to the player, planeswalker, or battle it's attacking.`,
  ],
  Lifelink: [
    msg`Lifelink`,
    msg`Damage dealt by this permanent also causes its controller to gain that much life.`,
  ],
  Deathtouch: [
    msg`Deathtouch`,
    msg`Any amount of damage this creature deals to a creature is enough to destroy it.`,
  ],
  Reach: [msg`Reach`, msg`This creature can block creatures with flying.`],
  Haste: [
    msg`Haste`,
    msg`This creature can attack and use tap abilities even if it hasn't been under your control since your turn began.`,
  ],
  Hexproof: [
    msg`Hexproof`,
    msg`This permanent can't be the target of spells or abilities your opponents control.`,
  ],
  Menace: [msg`Menace`, msg`This creature can't be blocked except by two or more creatures.`],
  Indestructible: [
    msg`Indestructible`,
    msg`This permanent can't be destroyed by lethal damage or effects that say “destroy”.`,
  ],
  Defender: [msg`Defender`, msg`This creature can't attack.`],
  Flash: [msg`Flash`, msg`You may cast this spell any time you could cast an instant.`],
  Ward: [
    msg`Ward`,
    msg`Whenever an opponent targets this permanent, counter that spell or ability unless they pay its ward cost.`,
  ],
  Shroud: [msg`Shroud`, msg`This permanent can't be the target of spells or abilities.`],
  Fear: [
    msg`Fear`,
    msg`This creature can't be blocked except by artifact creatures and black creatures.`,
  ],
  Intimidate: [
    msg`Intimidate`,
    msg`This creature can't be blocked except by artifact creatures and creatures that share a color with it.`,
  ],
  Skulk: [msg`Skulk`, msg`This creature can't be blocked by creatures with greater power.`],
  Prowess: [
    msg`Prowess`,
    msg`Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.`,
  ],
  Infect: [
    msg`Infect`,
    msg`Damage from this source gives players poison counters and is dealt to creatures as -1/-1 counters.`,
  ],
  Wither: [msg`Wither`, msg`Damage from this source is dealt to creatures as -1/-1 counters.`],
  Persist: [
    msg`Persist`,
    msg`When this creature dies, if it had no -1/-1 counters on it, return it to the battlefield under its owner's control with a -1/-1 counter.`,
  ],
  Undying: [
    msg`Undying`,
    msg`When this creature dies, if it had no +1/+1 counters on it, return it to the battlefield under its owner's control with a +1/+1 counter.`,
  ],
  Protection: [
    msg`Protection`,
    msg`This permanent can't be damaged, enchanted, equipped, blocked, or targeted by anything with the specified quality.`,
  ],
  Flashback: [
    msg`Flashback`,
    msg`You may cast this card from your graveyard for its flashback cost. If it would leave the stack, exile it instead.`,
  ],
} as const;

type KeywordName = keyof typeof KEYWORDS;

export interface ResolvedCardKeyword {
  raw: string;
  name: string;
  label: string;
  parameter: string | null;
  manaCost: string | null;
  description: string | null;
}

const parameterized = new Set<KeywordName>(["Flashback"]);

function isManaCost(value: string): boolean {
  const symbols = value.startsWith("{")
    ? [...value.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]!)
    : value.trim().split(/\s+/);
  const residue = value.startsWith("{") ? value.replace(/\{[^}]+\}/g, "") : "";
  return (
    symbols.length > 0 &&
    residue.trim().length === 0 &&
    symbols.every((symbol) => MANA_CODE_SET.has(symbol.trim().toUpperCase() as ManaCode))
  );
}

export function resolveCardKeyword(
  raw: string,
  displayName?: string,
  translator = i18n,
): ResolvedCardKeyword {
  const separator = raw.indexOf(":");
  const rawName = (separator < 0 ? raw : raw.slice(0, separator)).trim();
  const canonical = (Object.keys(KEYWORDS) as KeywordName[]).find(
    (name) => name.toLowerCase() === rawName.toLowerCase(),
  );
  if (!canonical) {
    return {
      raw,
      name: rawName,
      label: displayName ?? rawName,
      parameter: separator < 0 ? null : raw.slice(separator + 1).trim(),
      manaCost:
        separator < 0 || !raw.slice(separator + 1).trim()
          ? null
          : isManaCost(raw.slice(separator + 1).trim())
            ? raw.slice(separator + 1).trim()
            : null,
      description: null,
    };
  }

  const parameter = separator < 0 ? null : raw.slice(separator + 1).trim();
  const [labelMessage, descriptionMessage] = KEYWORDS[canonical];
  const label = translator._(labelMessage);
  const cost = parameter && isManaCost(parameter) ? parameter : null;
  let description = translator._(descriptionMessage);
  if (cost && parameterized.has(canonical)) {
    if (canonical === "Flashback") {
      description = translator._(
        msg`You may cast this card from your graveyard by paying ${parameter ?? ""} instead of its mana cost. If it would leave the stack, exile it instead.`,
      );
    }
  }
  return {
    raw,
    name: canonical,
    label,
    parameter,
    manaCost: cost,
    description,
  };
}
