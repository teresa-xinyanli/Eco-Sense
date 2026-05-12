import { EnvParams, TreeState } from '../types';

interface TreeCondition {
  temp?: string;
  humidity?: string;
  light?: string;
}

interface TreeRule {
  conditions: TreeCondition;
  emotion: string;
  physiology: string;
  visual: string;
  sound: string;
}

interface TreeDefinition {
  species: string;
  rules: TreeRule[];
}

// --- Tree Emotion Engine Data ---
// Structure based on the provided JSON specification
const TREE_ENGINE_DATA: { trees: TreeDefinition[] } = {
  "trees": [
    {
      "species": "Red Maple",
      "rules": [
        {
          "conditions": { "temp": "<5", "light": "<20" },
          "emotion": "Tired",
          "physiology": "Dormancy approaching",
          "visual": "Dim brown-gray foliage",
          "sound": "Slow, muffled tone"
        },
        {
          "conditions": { "temp": "15-27", "humidity": "50-80" },
          "emotion": "Calm",
          "physiology": "Stable photosynthesis",
          "visual": "Balanced green tone",
          "sound": "Gentle rustling"
        },
        {
          "conditions": { "temp": ">35", "humidity": "<30" },
          "emotion": "Anxious",
          "physiology": "High transpiration stress",
          "visual": "Yellow flickering leaves",
          "sound": "Sharp, high-pitched shimmer"
        }
      ]
    },
    {
      "species": "Ginkgo",
      "rules": [
        {
          "conditions": { "temp": "15-30" },
          "emotion": "Content",
          "physiology": "Efficient metabolism",
          "visual": "Deep green fan-shaped leaves",
          "sound": "Soft ambient chime"
        },
        {
          "conditions": { "temp": ">38", "humidity": "<20" },
          "emotion": "Overheated",
          "physiology": "Partial stomatal closure",
          "visual": "Drying leaf tips",
          "sound": "Rising white noise tone"
        }
      ]
    },
    {
      "species": "London Plane",
      "rules": [
        {
          "conditions": { "temp": "20-30" },
          "emotion": "Healthy",
          "physiology": "Rapid canopy growth",
          "visual": "Vibrant broad leaves",
          "sound": "Full-bodied breeze tone"
        },
        {
          "conditions": { "temp": ">40" },
          "emotion": "Scorched",
          "physiology": "Leaf edge necrosis",
          "visual": "Brown spotting and curl",
          "sound": "Crackling pulse"
        }
      ]
    },
    {
      "species": "Honey Locust",
      "rules": [
        {
          "conditions": { "temp": "20-35", "humidity": "30-60" },
          "emotion": "Thriving",
          "physiology": "Optimal photosynthesis",
          "visual": "Golden-green shimmer",
          "sound": "Light rhythmic wave"
        },
        {
          "conditions": { "temp": ">40" },
          "emotion": "Surviving",
          "physiology": "Water conservation mode",
          "visual": "Leaf thinning",
          "sound": "Sparse pulsing echo"
        }
      ]
    },
    {
      "species": "Pin Oak",
      "rules": [
        {
          "conditions": { "humidity": ">50" }, // Note: Temp acts as wildcard if not present in rule
          "emotion": "Balanced",
          "physiology": "Full leaf respiration",
          "visual": "Dark green, lush canopy",
          "sound": "Wet forest ambiance"
        },
        {
          "conditions": { "temp": ">35", "humidity": "<40" },
          "emotion": "Withering",
          "physiology": "Leaf stress and abscission",
          "visual": "Crimson edges, early drop",
          "sound": "Rapid clicking rustle"
        }
      ]
    },
    {
      "species": "Littleleaf Linden",
      "rules": [
        {
          "conditions": { "temp": "18-26", "humidity": "60-85" },
          "emotion": "Flourishing",
          "physiology": "Full bloom and canopy",
          "visual": "Bright emerald leaves",
          "sound": "Soft floral wind hum"
        },
        {
          "conditions": { "temp": ">32", "humidity": "<40" },
          "emotion": "Exhausted",
          "physiology": "Leaf edge burning",
          "visual": "Crisped edges, dulling",
          "sound": "Slow distorted flutter"
        }
      ]
    }
  ]
};

// --- Logic Helpers ---

/**
 * Parses and evaluates a condition string against a numeric value.
 * Supports: ">35", "<5", "15-27"
 */
const checkCondition = (value: number, conditionStr?: string): boolean => {
  if (!conditionStr) return true; // Property not specified in condition means 'any' is acceptable

  const cleanStr = conditionStr.trim();

  // Handle Range: "15-27" or "15–27"
  if (cleanStr.includes('-') || cleanStr.includes('–')) {
    const parts = cleanStr.replace('–', '-').split('-');
    if (parts.length === 2) {
      const min = parseFloat(parts[0]);
      const max = parseFloat(parts[1]);
      return value >= min && value <= max;
    }
  }

  // Handle Greater Than: ">35"
  if (cleanStr.startsWith('>')) {
    return value > parseFloat(cleanStr.substring(1));
  }
  
  // Handle Less Than: "<5"
  if (cleanStr.startsWith('<')) {
    return value < parseFloat(cleanStr.substring(1));
  }

  return false;
};

/**
 * Main Engine Function
 * Matches current inputs against the JSON ruleset.
 */
export const getScientificTreeState = (params: EnvParams): Partial<TreeState> | null => {
  // 1. Find the species data
  const treeData = TREE_ENGINE_DATA.trees.find(t => t.species === params.species);
  
  // If species not found in our hardcoded DB (e.g. custom detected species), return null so Gemini can handle it generically
  if (!treeData) return null;

  // 2. Iterate through rules to find the first match
  // We check all defined conditions in a rule. If a rule has no condition for 'temp', it matches any temp.
  for (const rule of treeData.rules) {
    const tempMatch = !rule.conditions.temp || checkCondition(params.temperature, rule.conditions.temp);
    const humidMatch = !rule.conditions.humidity || checkCondition(params.humidity, rule.conditions.humidity);
    const lightMatch = !rule.conditions.light || checkCondition(params.light, rule.conditions.light);

    if (tempMatch && humidMatch && lightMatch) {
      return {
        emotionalStatus: rule.emotion,
        physiologicalState: rule.physiology,
        visualSignal: rule.visual,
        sonicResponse: rule.sound
      };
    }
  }

  // 3. Fallback / Default State if no specific rule matches
  // This ensures the UI always shows something valid for the species even if between ranges
  return {
    emotionalStatus: "Observant",
    physiologicalState: "Baseline metabolic rate maintained.",
    visualSignal: "Standard foliage coloration for this species.",
    sonicResponse: "Ambient breeze."
  };
};