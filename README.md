# Eco-Sense: Interactive Environmental Empathy Engine

Eco-Sense is a cutting-edge web application that bridges the gap between urban data and botanical consciousness. It simulates the emotional and physiological states of trees by processing real-time environmental data through the lens of multimodal AI and scientific plant physiology.

![Eco-Sense Preview](https://img.shields.io/badge/Status-Project_Ready-brightgreen)
![Tech Stack](https://img.shields.io/badge/Stack-React_|_Three.js_|_Gemini-blue)

---

## 🌟 Vision

In urban environments, trees are often viewed as static infrastructure. **Eco-Sense** transforms this perception by giving trees a "voice" and a "consciousness." By mapping temperature, humidity, light, and spatial context (proximity to buildings, pavement stress) to psychological indicators, the app fosters environmental empathy through immersive 3D visualization and poetic reflection.

---

## 🚀 Core Features

### 1. **Environmental Multi-Modal Input**
*   **Live Weather Sync**: Uses Geolocation and OpenWeather API to fetch current local conditions (Temp, Humidity, Light/Cloud Cover).
*   **Google Street View Analysis**: Scan any coordinate. The system identifies local species and analyzes the spatial context (e.g., "Is the tree trapped in a wind tunnel between skyscrapers?").
*   **Camera Identification**: Upload or take a photo of a tree. The system uses **PlantNet** for species detection and **Gemini Vision** to estimate health and morphology.

### 2. **Artificial Consciousness (Gemini AI)**
*   **Reflection Layer**: Generates first-person poetic narratives of the tree's internal experience based on current conditions.
*   **Physiological Simulation**: Maps data to states like "Stressed," "Thriving," "Dormant," or "Strained."
*   **Deterministic Fallback**: Includes a built-in `SpeciesEngine` that provides scientifically accurate baseline data even when AI services are offline.

### 3. **Immersive 3D Visualization**
*   **Dynamic Morphologies**: 3D tree models that reflect species-specific crown shapes (spherical, conical, vase, etc.).
*   **Emotional Shaders**: Visualizes "metabolic function" through particle systems and shader effects (Linkage, Points, Sound-wave mapping).
*   **AR Immersion**: Transition from 2D maps to a "Visualized Emotion" overlay that blends 3D data into Street View.

---

## 🛠 Tech Stack

*   **Frontend**: React 18, TypeScript, Vite
*   **Visualization**: Three.js, React Three Fiber (@react-three/fiber), React Three Drei
*   **Styling**: Tailwind CSS
*   **AI/LLM**: Google Gemini (Flash 1.5/2.0)
*   **External APIs**: 
    -   Google Maps Street View Static API
    -   OpenWeatherMap API
    -   PlantNet API (Species Identification)
*   **Icons**: Lucide React

---

## 📋 Setup & Installation

### 1. Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn

### 2. Clone and Install
```bash
git clone https://github.com/your-username/eco-sense.git
cd eco-sense
npm install
```

### 3. Environment Configuration 🔑
This project requires several API keys to function fully. 
1.  Copy `.env.example` to a new file named `.env`:
    ```bash
    cp .env.example .env
    ```
2.  Open `.env` and fill in your keys:

| Secret | Description | Where to Get |
| :--- | :--- | :--- |
| **`GEMINI_API_KEY`** | Core AI Logic (Analysis & Reflection) | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| **`VITE_OPENWEATHER_KEY`** | Real-time weather data | [OpenWeatherMap](https://openweathermap.org/api) |
| **`VITE_PLANTNET_KEY`** | Species Identification from photos | [PlantNet API](https://my.plantnet.org/) |
| **`VITE_GOOGLE_MAPS_KEY`** | Street View & Geocoding | [Google Cloud Console](https://console.cloud.google.com/) |

> **Security Note**: Never commit your `.env` file to GitHub. It is already included in `.gitignore`.

### 4. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📖 How to Use

1.  **Manual Exploration**: Use the sliders in the **Left Panel** to simulate different species and weather conditions.
2.  **Go Live**: Click "Enable Live Data" to sync the experience with your current physical location's weather.
3.  **Street View Mode**: Switch to the Map icon in the viewport. Navigate to a city, align the view with a tree, and click **"Analyze View"**. The AI will "read" the urban environment.
4.  **Immersive Visualization**: Once a state is generated, click **"Visualize Emotion"** to enter the particle-based shader mode.

---

## 📂 Project Structure

```text
/src
  /components
    CenterPanel.tsx      # Main viewport (3D Canvas, Street View, Camera)
    LeftPanel.tsx        # Environmental Parameter Controls
    RightPanel.tsx       # State & Physiological Statistics
    TreeVisualizer.tsx   # Core 3D logic and Shader variants
    ReflectionLayer.tsx  # The bottom "consciousness" narrative
  /services
    geminiService.ts     # AI Prompts & Multi-modal analysis
    externalServices.ts  # Weather & Identification API calls
    speciesEngine.ts     # Botanical logic engine (fallbacks)
  /types.ts              # Global TS interfaces
  App.tsx                # State orchestration
```

---

## 📜 License
This project is open-source. Please credit the original authors if using the `SpeciesEngine` or shader logic.

---

*“I am standing waiting for the sun to break through the gray.”* — Eco-Sense reflection.
