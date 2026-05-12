
import { GoogleGenAI, Type } from "@google/genai";
import { EnvParams, TreeState, SpatialMetrics, TREE_SPECIES } from "../types";
import { getScientificTreeState } from "./speciesEngine";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = "gemini-2.5-flash";

// --- Helper: Convert URL to Base64 (Best Effort for Street View) ---
const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image");
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("CORS/Network error fetching Street View image. Falling back to Location-based context.", error);
    throw error;
  }
};

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeTreeState = async (params: EnvParams): Promise<TreeState> => {
  // 1. Get scientifically accurate state from the deterministic engine first
  const engineState = getScientificTreeState(params);

  const context = engineState 
    ? `
      Scientific Context (strictly adhere to this):
      - Emotional State: ${engineState.emotionalStatus}
      - Physiological: ${engineState.physiologicalState}
      - Visual: ${engineState.visualSignal}
      - Sound: ${engineState.sonicResponse}
      `
    : `
      Scientific Context: The species is "${params.species}". It might be a new or unknown species to your database. 
      Analyze it based on general botany knowledge for this species in the current ${params.temperature}°C environment.
      `;

  const prompt = `
    Act as the consciousness of a specific tree. 
    Species: ${params.species}
    Environment: ${params.environment} field/space.
    Conditions: Temp ${params.temperature}°C, Humidity ${params.humidity}%, Light ${params.light}/100.

    ${context}

    Task:
    1. If Scientific Context is provided above, you MUST use those exact values for emotionalStatus, physiologicalState, sonicResponse, and visualSignal.
    2. If NOT provided, generate scientifically plausible values for this species.
    3. Write a "reflection": A poetic, first-person thought (1-2 sentences) matching this specific state.
    
    Output JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotionalStatus: { type: Type.STRING },
            physiologicalState: { type: Type.STRING },
            sonicResponse: { type: Type.STRING },
            visualSignal: { type: Type.STRING },
            reflection: { type: Type.STRING },
          },
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from Gemini");
    
    const geminiResult = JSON.parse(jsonText) as TreeState;

    if (engineState) {
        return {
            ...geminiResult,
            emotionalStatus: engineState.emotionalStatus || geminiResult.emotionalStatus,
            physiologicalState: engineState.physiologicalState || geminiResult.physiologicalState,
            sonicResponse: engineState.sonicResponse || geminiResult.sonicResponse,
            visualSignal: engineState.visualSignal || geminiResult.visualSignal,
            isSimulation: false
        };
    }

    return geminiResult;

  } catch (error: any) {
    console.warn("Gemini API Error (Quota/Network). Falling back to scientific engine.", error);
    
    // Fallback using the local engine + generic reflection
    if (engineState) {
        return {
            ...engineState as TreeState,
            reflection: "My connection to the cloud is quiet, but my roots feel the earth clearly.",
            isSimulation: true
        };
    }

    // Absolute fallback
    return {
      emotionalStatus: "Observing", 
      physiologicalState: "Metabolic functions stabilized (Offline).",
      sonicResponse: "Gentle ambient hum.",
      visualSignal: "Standard foliage.",
      reflection: "I wait in silence for the data to flow again.",
      isSimulation: true
    };
  }
};

// Deprecated in favor of full analysis, but kept for legacy calls if needed
export const identifyTreeSpecies = async (imageFile: File): Promise<string | null> => {
  try {
    const base64 = await fileToBase64(imageFile);
    const imagePart = { inlineData: { data: base64, mimeType: imageFile.type } };
    
    const prompt = `Analyze this image and identify the tree species. 
    Return ONLY the common name. If uncertain, return 'Unknown'.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [imagePart, { text: prompt }] }
    });

    const text = response.text;
    return (text && text.toLowerCase().trim() !== 'unknown') ? text.trim() : null;
  } catch (error) {
    console.warn("Gemini Vision Error:", error);
    return "Unknown Species";
  }
};

// --- Street View & Camera Analysis Types ---

export interface StreetViewAnalysisResult {
  species: string;
  state: TreeState;
  environment: {
    temperature: number;
    humidity: number;
    light: number;
    crownShape: 'spherical' | 'conical' | 'spreading' | 'columnar' | 'vase' | 'palm';
    canopyProfile: number[]; // Extracted silhouette profile
    trunkHeightRatio: number;
    foliageColor: string;
  };
  spatial: SpatialMetrics;
}

// --- Feature 1: Street View Analysis ---

export const analyzeStreetView = async (
  lat: number, 
  lng: number, 
  heading: number, 
  pitch: number,
  apiKey: string
): Promise<StreetViewAnalysisResult> => {

  const staticImageUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=80&key=${apiKey}`;
  
  let imagePart = null;
  let textPrompt = "";

  try {
    const base64Data = await urlToBase64(staticImageUrl);
    imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: "image/jpeg",
      },
    };
    textPrompt = `
      1. Analyze the Street View image. Identify the dominant tree species in the CENTER of the view.
      2. **VISUAL MORPHOLOGY**: Classify the tree's silhouette shape into one of: 'spherical', 'conical', 'spreading', 'columnar', 'vase', 'palm'.
      3. **SILHOUETTE PROFILE (Important)**: Visually scan the tree canopy in the center from bottom to top. Divide it into 8 vertical slices. For each slice, estimate the relative width of the foliage (0.1 to 1.0, where 1.0 is the widest part). Return this as 'canopyProfile' array.
      4. Estimate 'trunkHeightRatio' (0.1 to 0.5) based on how much of the tree is trunk vs canopy.
      5. Extract the dominant 'foliageColor' (hex code) from the image.
      6. Perform SPATIAL CONTEXT ANALYSIS.
      7. Estimate Environmental Conditions.
      8. GENERATE TREE STATE.
      
      Output JSON.
    `;
  } catch (e) {
     // If image fetch fails, we proceed without image to get a location-based simulation
     textPrompt = `Location: Lat ${lat}, Lng ${lng}. Estimate typical urban tree species and environment here. Output JSON.`;
  }

  return executeFullAnalysis(textPrompt, imagePart);
};

// --- Feature 2: Camera / Upload Analysis ---

export const analyzeTreeImage = async (
  imageFile: File,
  userLocation?: { lat: number, lon: number }
): Promise<StreetViewAnalysisResult> => {

  const base64Data = await fileToBase64(imageFile);
  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: imageFile.type,
    },
  };

  const locString = userLocation ? `I am at Lat: ${userLocation.lat}, Lon: ${userLocation.lon}.` : "";

  const textPrompt = `
    ${locString}
    1. Analyze this image. Identify the dominant tree.
    2. **VISUAL MORPHOLOGY**: Classify shape and EXTRACT 'canopyProfile' (8 width values from bottom to top) matching the image silhouette.
    3. Estimate 'trunkHeightRatio' and 'foliageColor'.
    4. Perform SPATIAL CONTEXT ANALYSIS.
    5. Estimate Environmental Conditions.
    6. GENERATE TREE STATE.
    
    Output JSON.
  `;

  return executeFullAnalysis(textPrompt, imagePart);
};

// --- Shared Execution Logic ---

async function executeFullAnalysis(textPrompt: string, imagePart: any): Promise<StreetViewAnalysisResult> {
  const parts: any[] = [{ text: textPrompt }];
  if (imagePart) parts.unshift(imagePart);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedSpecies: { type: Type.STRING },
            detectedShape: { type: Type.STRING },
            canopyProfile: { 
              type: Type.ARRAY, 
              items: { type: Type.NUMBER },
              description: "8 width values (0-1) representing the canopy silhouette from bottom to top"
            },
            trunkHeightRatio: { type: Type.NUMBER },
            foliageColor: { type: Type.STRING },
            
            estimatedTemperature: { type: Type.NUMBER },
            estimatedHumidity: { type: Type.NUMBER },
            estimatedLight: { type: Type.NUMBER },
            
            hasBuildingProximity: { type: Type.BOOLEAN },
            isStreetSide: { type: Type.BOOLEAN },
            hasPavement: { type: Type.BOOLEAN },
            isEnclosed: { type: Type.BOOLEAN },
            scientificAnalysis: { type: Type.STRING },

            emotionalStatus: { type: Type.STRING },
            physiologicalState: { type: Type.STRING },
            sonicResponse: { type: Type.STRING },
            visualSignal: { type: Type.STRING },
            reflection: { type: Type.STRING },
          },
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    
    return {
      species: data.detectedSpecies || "Unknown Tree",
      environment: {
        temperature: data.estimatedTemperature ?? 15,
        humidity: data.estimatedHumidity ?? 50,
        light: data.estimatedLight ?? 50,
        crownShape: (data.detectedShape as any) || 'spherical',
        canopyProfile: data.canopyProfile || [0.2, 0.4, 0.6, 0.8, 1.0, 0.9, 0.6, 0.3], 
        trunkHeightRatio: data.trunkHeightRatio || 0.15,
        foliageColor: data.foliageColor || "#2d5a27"
      },
      spatial: {
        hasBuildingProximity: !!data.hasBuildingProximity,
        isStreetSide: !!data.isStreetSide,
        hasPavement: !!data.hasPavement,
        isEnclosed: !!data.isEnclosed,
        scientificAnalysis: data.scientificAnalysis || "Standard urban environmental analysis."
      },
      state: {
        emotionalStatus: data.emotionalStatus || "Observing",
        physiologicalState: data.physiologicalState || "Analyzing environment.",
        sonicResponse: data.sonicResponse || "City hum.",
        visualSignal: data.visualSignal || "Standing still.",
        reflection: data.reflection || "I am watching.",
        isSimulation: false
      }
    };
  } catch (error: any) {
    console.warn("Gemini Analysis Error (Quota/Network). Falling back to Simulation.", error);

    // --- Fallback Simulation Construction ---
    // Create a plausible response so the app doesn't crash during 429 errors.
    
    // Pick a random species from our supported list to simulate detection
    const randomSpecies = TREE_SPECIES[Math.floor(Math.random() * TREE_SPECIES.length)];
    
    // Create random environmental conditions roughly matching an urban day
    const fallbackEnv: EnvParams = {
        species: randomSpecies,
        temperature: 20 + (Math.random() * 10 - 5),
        humidity: 60 + (Math.random() * 20 - 10),
        light: 50 + (Math.random() * 40 - 20),
        environment: 'open',
        crownShape: 'spreading',
        trunkHeightRatio: 0.15,
        foliageColor: "#2d5a27"
    };

    // Use the species engine to get plausible state data for this fallback environment
    const sciState = getScientificTreeState(fallbackEnv);
    
    return {
      species: randomSpecies,
      environment: {
        ...fallbackEnv,
        crownShape: 'spreading',
        canopyProfile: [0.25, 0.4, 0.6, 0.8, 1.0, 0.8, 0.5, 0.3],
        trunkHeightRatio: 0.15,
        foliageColor: "#3e5c35" 
      },
      spatial: {
        hasBuildingProximity: true,
        isStreetSide: true,
        hasPavement: true,
        isEnclosed: false,
        scientificAnalysis: "Data stream interrupted (Quota). Displaying estimated urban tree metrics based on typical street conditions."
      },
      state: {
        emotionalStatus: sciState?.emotionalStatus || "Resilient",
        physiologicalState: sciState?.physiologicalState || "Metabolism stabilized in simulation.",
        sonicResponse: sciState?.sonicResponse || "Internal hum.",
        visualSignal: sciState?.visualSignal || "Typical foliage.",
        reflection: "The digital connection is faint, but life persists offline.",
        isSimulation: true
      }
    };
  }
}
