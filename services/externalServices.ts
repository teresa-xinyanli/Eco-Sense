import { EnvParams } from "../types";

const OPENWEATHER_KEY = import.meta.env.VITE_OPENWEATHER_KEY;
const PLANTNET_API_KEY = import.meta.env.VITE_PLANTNET_KEY;

export const fetchWeatherData = async (lat: number, lon: number): Promise<Partial<EnvParams> | null> => {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_KEY}`
    );
    const data = await response.json();
    
    if (data.main) {
      // Map Cloud cover (0-100) to Light. 
      // 100% clouds = low light (e.g. 20), 0% clouds = high light (100).
      // This is a rough approximation.
      const lightLevel = Math.max(0, 100 - data.clouds.all);
      
      return {
        temperature: Math.round(data.main.temp),
        humidity: data.main.humidity,
        light: lightLevel,
        environment: 'open' // Default to open for outdoor weather
      };
    }
    return null;
  } catch (error) {
    console.error("Weather API Error:", error);
    return null;
  }
};

export const identifyPlantSpecies = async (imageFile: File): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append('images', imageFile);
    formData.append('organs', 'auto'); // Auto-detect organ (leaf, bark, etc.)

    // Added 'no-reject=true' to get results even if confidence is low
    const response = await fetch(
      `https://my-api.plantnet.org/v2/identify/all?include-related-images=false&no-reject=true&lang=en&api-key=${PLANTNET_API_KEY}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    // Check for API errors (e.g., Invalid Key, Quota Exceeded)
    if (!response.ok) {
      const errorMessage = data.message || data.error || `API Error (${response.status})`;
      throw new Error(errorMessage);
    }

    if (data.results && data.results.length > 0) {
      // Return the common name of the highest confidence result
      const bestMatch = data.results[0];
      
      // Log the score for debugging
      console.log(`Identified: ${bestMatch.species.scientificNameWithoutAuthor} (Score: ${bestMatch.score})`);

      if (bestMatch.species && bestMatch.species.commonNames && bestMatch.species.commonNames.length > 0) {
         // Capitalize first letter
         const name = bestMatch.species.commonNames[0];
         return name.charAt(0).toUpperCase() + name.slice(1);
      }
      return bestMatch.species.scientificNameWithoutAuthor;
    }
    
    // If no results found (unlikely with no-reject=true)
    return null;
  } catch (error: any) {
    console.error("PlantNet API Error:", error);
    // Re-throw the error so the UI can display the specific message
    throw error;
  }
};