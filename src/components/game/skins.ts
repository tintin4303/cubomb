export type SkinRarity = "Standard" | "Special" | "Elite" | "Legendary";

export interface PilotSkin {
  id: string;
  name: string;
  tagline: string;
  rarity: SkinRarity;
  previewColor: string; // Hex string for badge / nameplate / legacy sync
  suitColor: number; // Hex number for suit base (metal)
  accentColor: number; // Hex number for suit accents / chest / shoulders (metalRed)
  jointColor: number; // Hex number for joints / boots / pack (dark / metalDark)
  visorColor: number; // Hex number for visor faceplate (rockDark)
  visorEmissive: number; // Hex number for visor glow
  visorEmissiveIntensity: number;
  haloColor: number; // Hex number for ground locator ring
  nameplateBorder: string; // Hex string for sprite border
}

export const PILOT_SKINS: PilotSkin[] = [
  {
    id: "apollo_arctic",
    name: "Apollo Arctic",
    tagline: "Polar titanium white EVA armor with azure pulse",
    rarity: "Standard",
    previewColor: "#0284c7",
    suitColor: 0xf1f5f9,
    accentColor: 0x0284c7,
    jointColor: 0x334155,
    visorColor: 0x00e5ff,
    visorEmissive: 0x0284c7,
    visorEmissiveIntensity: 0.45,
    haloColor: 0x38bdf8,
    nameplateBorder: "#38bdf8",
  },
  {
    id: "solar_hazard",
    name: "Solar Hazard",
    tagline: "Industrial blast composite with warning amber plating",
    rarity: "Special",
    previewColor: "#f59e0b",
    suitColor: 0x1e293b,
    accentColor: 0xf59e0b,
    jointColor: 0x0f172a,
    visorColor: 0xfbbf24,
    visorEmissive: 0xd97706,
    visorEmissiveIntensity: 0.5,
    haloColor: 0xf59e0b,
    nameplateBorder: "#f59e0b",
  },
  {
    id: "void_stealth",
    name: "Void Stealth",
    tagline: "Ultra-matte obsidian shell with ultraviolet energy channels",
    rarity: "Elite",
    previewColor: "#a855f7",
    suitColor: 0x090d16,
    accentColor: 0xa855f7,
    jointColor: 0x020617,
    visorColor: 0xc084fc,
    visorEmissive: 0x9333ea,
    visorEmissiveIntensity: 0.55,
    haloColor: 0xa855f7,
    nameplateBorder: "#a855f7",
  },
  {
    id: "cyber_neon",
    name: "Cyber Neon",
    tagline: "Overclocked sub-surface synth plating with dual-tone neon",
    rarity: "Legendary",
    previewColor: "#ec4899",
    suitColor: 0x0f172a,
    accentColor: 0xec4899,
    jointColor: 0x0284c7,
    visorColor: 0x06b6d4,
    visorEmissive: 0x06b6d4,
    visorEmissiveIntensity: 0.6,
    haloColor: 0xec4899,
    nameplateBorder: "#ec4899",
  },
  {
    id: "emerald_scout",
    name: "Emerald Scout",
    tagline: "Tactical bio-hardened exo-plating with luminescent visor",
    rarity: "Special",
    previewColor: "#10b981",
    suitColor: 0x13221b,
    accentColor: 0x10b981,
    jointColor: 0x0a1410,
    visorColor: 0x34d399,
    visorEmissive: 0x059669,
    visorEmissiveIntensity: 0.45,
    haloColor: 0x10b981,
    nameplateBorder: "#10b981",
  },
  {
    id: "crimson_raider",
    name: "Crimson Raider",
    tagline: "Reinforced volcanic geothermal armor with thermal infrared optics",
    rarity: "Elite",
    previewColor: "#ef4444",
    suitColor: 0x18181b,
    accentColor: 0xef4444,
    jointColor: 0x27272a,
    visorColor: 0xf87171,
    visorEmissive: 0xb91c1c,
    visorEmissiveIntensity: 0.5,
    haloColor: 0xef4444,
    nameplateBorder: "#ef4444",
  },
];

export const DEFAULT_SKIN_ID = "apollo_arctic";

const LEGACY_COLOR_MAP: Record<string, string> = {
  "#0284c7": "apollo_arctic",
  "#38bdf8": "apollo_arctic",
  "#10b981": "emerald_scout",
  "#059669": "emerald_scout",
  "#f59e0b": "solar_hazard",
  "#d97706": "solar_hazard",
  "#ef4444": "crimson_raider",
  "#b91c1c": "crimson_raider",
  "#8b5cf6": "void_stealth",
  "#a855f7": "void_stealth",
  "#ec4899": "cyber_neon",
  "#db2777": "cyber_neon",
};

export function getPilotSkin(skinIdOrColor?: string): PilotSkin {
  if (!skinIdOrColor) {
    return PILOT_SKINS[0];
  }

  // Exact ID match
  const byId = PILOT_SKINS.find((s) => s.id === skinIdOrColor);
  if (byId) return byId;

  // Legacy color map match
  const mappedId = LEGACY_COLOR_MAP[skinIdOrColor.toLowerCase()];
  if (mappedId) {
    const mapped = PILOT_SKINS.find((s) => s.id === mappedId);
    if (mapped) return mapped;
  }

  // Color preview match
  const byPreview = PILOT_SKINS.find((s) => s.previewColor.toLowerCase() === skinIdOrColor.toLowerCase());
  if (byPreview) return byPreview;

  // Fallback: generate custom skin from hex color string
  if (skinIdOrColor.startsWith("#")) {
    const hexNum = parseInt(skinIdOrColor.replace("#", "0x"), 16) || 0x0284c7;
    return {
      id: `custom_${skinIdOrColor}`,
      name: "Pilot Custom",
      tagline: "Custom telemetry frequency signature",
      rarity: "Standard",
      previewColor: skinIdOrColor,
      suitColor: 0x1e293b,
      accentColor: hexNum,
      jointColor: 0x0f172a,
      visorColor: hexNum,
      visorEmissive: hexNum,
      visorEmissiveIntensity: 0.45,
      haloColor: hexNum,
      nameplateBorder: skinIdOrColor,
    };
  }

  return PILOT_SKINS[0];
}
