
import React, { useState, useEffect, useRef } from 'react';
import LeftPanel from './components/LeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';
import ReflectionLayer from './components/ReflectionLayer';
import { EnvParams, TreeState, ViewMode, UserLocation, SpatialMetrics } from './types';
import { analyzeTreeState } from './services/geminiService';
import { fetchWeatherData } from './services/externalServices';
import { Volume2, Minimize2, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [params, setParams] = useState<EnvParams>({
    species: 'Ginkgo',
    temperature: 15,
    humidity: 81,
    light: 25,
    environment: 'open'
  });

  const [treeState, setTreeState] = useState<TreeState>({
    emotionalStatus: 'Neutral',
    physiologicalState: 'Stable metabolic function.',
    sonicResponse: 'Consistent, ambient white noise.',
    visualSignal: 'Foliage color shifts to represent internal stress or balance.',
    reflection: 'I stand waiting for the sun to break through the gray.'
  });

  const [spatialMetrics, setSpatialMetrics] = useState<SpatialMetrics | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.STYLIZED);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  
  // Debounce ref to prevent too many Gemini API calls
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performAnalysis = async (currentParams: EnvParams) => {
    setLoading(true);
    try {
      const newState = await analyzeTreeState(currentParams);
      setTreeState(newState);
    } catch (e: any) {
      console.error("Analysis Failure:", e);
      // Fallback is now handled in service, but if critical failure happens:
      // We do not overwrite with error message to keep UI clean, 
      // relying on previous state or service fallback.
    } finally {
      setLoading(false);
    }
  };

  // --- Effects ---

  // Trigger Gemini Analysis when params change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    setLoading(true);
    debounceRef.current = setTimeout(() => {
      performAnalysis(params);
    }, 1500); // 1.5s debounce

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [params]);

  // Handle Live Data Toggling
  const handleToggleLive = () => {
    if (!isLive) {
      // Enable Live Data
      if (navigator.geolocation) {
        setFetchingWeather(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const loc = {
              lat: position.coords.latitude,
              lon: position.coords.longitude
            };
            setUserLocation(loc);
            
            // Fetch Weather immediately
            const weatherData = await fetchWeatherData(loc.lat, loc.lon);
            if (weatherData) {
              setParams(prev => ({ ...prev, ...weatherData }));
            }
            setFetchingWeather(false);
            setIsLive(true);
          },
          (error) => {
            console.error("Geolocation error:", error);
            setFetchingWeather(false);
            alert("Could not retrieve location. Live data unavailable.");
          }
        );
      } else {
        alert("Geolocation is not supported by this browser.");
      }
    } else {
      // Disable Live Data
      setIsLive(false);
    }
  };

  const handleManualRefresh = () => {
    performAnalysis(params);
  };

  return (
    <div className="min-h-screen p-6 md:p-8 flex flex-col max-w-[1600px] mx-auto">
      
      {/* Navbar / Header */}
      <header className="flex justify-between items-start mb-6 px-2">
        <div>
          <h1 className="serif text-4xl text-gray-900 mb-1">Eco-Sense</h1>
          <p className="text-sm text-gray-500 font-light">Interactive Environmental Empathy Engine</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1 text-xs font-medium text-gray-500">
               <Minimize2 size={16} /> Device
            </div>
            <button 
              onClick={handleManualRefresh}
              className="hidden md:flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-green-600 transition-colors"
              title="Force Refresh Data"
            >
               <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 
               {loading ? 'Updating...' : 'Refresh'}
            </button>
            <button className="bg-gray-200 p-3 rounded-full hover:bg-gray-300 transition-colors text-gray-700">
              <Volume2 size={20} />
            </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[700px]">
        
        {/* Left Panel: Parameters */}
        <div className="lg:col-span-3">
          <LeftPanel 
            params={params} 
            setParams={setParams} 
            isLive={isLive} 
            toggleLive={handleToggleLive}
            isLoadingWeather={fetchingWeather}
          />
        </div>

        {/* Center Panel: Viewport */}
        <div className="lg:col-span-6 h-[500px] lg:h-full">
          <CenterPanel 
             viewMode={viewMode} 
             setViewMode={setViewMode} 
             isLoading={loading}
             params={params}
             setParams={setParams}
             treeState={treeState}
             setTreeState={setTreeState}
             spatialMetrics={spatialMetrics}
             setSpatialMetrics={setSpatialMetrics}
             userLocation={userLocation}
          />
        </div>

        {/* Right Panel: Stats */}
        <div className="lg:col-span-3">
          <RightPanel 
            state={treeState} 
            spatial={spatialMetrics}
            isLoading={loading}
          />
        </div>

      </main>

      {/* Footer: Reflection Layer */}
      <ReflectionLayer text={treeState.reflection} />

    </div>
  );
};

export default App;
