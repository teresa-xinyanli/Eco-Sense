import React from 'react';
import { EnvParams, TREE_SPECIES } from '../types';
import { Leaf, Thermometer, Droplets, Sun, Wind, MapPin, Loader2 } from 'lucide-react';

interface LeftPanelProps {
  params: EnvParams;
  setParams: React.Dispatch<React.SetStateAction<EnvParams>>;
  isLive: boolean;
  toggleLive: () => void;
  isLoadingWeather: boolean;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ params, setParams, isLive, toggleLive, isLoadingWeather }) => {

  const updateParam = <K extends keyof EnvParams>(key: K, value: EnvParams[K]) => {
    // If live mode is active, user is overriding live data temporarily
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // Check if the current species is in our predefined list
  const isCustomSpecies = !TREE_SPECIES.includes(params.species);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm h-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="text-green-700">
          <Leaf size={20} />
        </div>
        <h2 className="serif text-xl font-semibold text-gray-800">Parameters</h2>
      </div>

      {/* Live Data Toggle */}
      <button 
        onClick={toggleLive}
        disabled={isLoadingWeather}
        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
          isLive 
            ? 'bg-green-600 text-white shadow-md shadow-green-200' 
            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
        }`}
      >
        {isLoadingWeather ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
        {isLoadingWeather ? 'FETCHING WEATHER...' : isLive ? 'LIVE LOCAL DATA ACTIVE' : 'ENABLE LIVE LOCAL DATA'}
      </button>

      {isLive && !isLoadingWeather && (
        <p className="text-[10px] text-center text-gray-400 -mt-4">
          Data sourced from OpenWeatherMap based on your location.
        </p>
      )}

      {/* Species */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-600 block">Tree Species</label>
        <div className="relative">
          <select 
            value={params.species}
            onChange={(e) => updateParam('species', e.target.value)}
            className={`w-full bg-gray-50 border text-gray-800 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-green-500/20 ${isCustomSpecies ? 'border-green-500 bg-green-50 font-medium' : 'border-gray-200'}`}
          >
            {/* Dynamically add the detected species if it's not in the list */}
            {isCustomSpecies && (
              <option value={params.species}>Detected: {params.species}</option>
            )}
            {TREE_SPECIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-6">
        {/* Temperature */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Thermometer size={16} className={isLive ? "text-green-600" : "text-gray-400"} /> 
              <span>Temperature</span>
            </div>
            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{params.temperature}°C</span>
          </div>
          <input 
            type="range" 
            min="-10" max="45" 
            value={params.temperature}
            onChange={(e) => updateParam('temperature', parseInt(e.target.value))}
            className="w-full slider-temp"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
            <span>-10°C</span>
            <span>45°C</span>
          </div>
        </div>

        {/* Humidity */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Droplets size={16} className={isLive ? "text-blue-500" : "text-gray-400"} /> 
              <span>Humidity</span>
            </div>
            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{params.humidity}%</span>
          </div>
          <input 
            type="range" 
            min="0" max="100" 
            value={params.humidity}
            onChange={(e) => updateParam('humidity', parseInt(e.target.value))}
            className="w-full slider-humid"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Light */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Sun size={16} className={isLive ? "text-amber-500" : "text-gray-400"} /> 
              <span>Light Exposure</span>
            </div>
            <span className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{params.light}</span>
          </div>
          <input 
            type="range" 
            min="0" max="100" 
            value={params.light}
            onChange={(e) => updateParam('light', parseInt(e.target.value))}
            className="w-full slider-light"
          />
          <div className="flex justify-between text-[10px] text-gray-400 font-medium">
            <span>Dark</span>
            <span>Bright</span>
          </div>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Environment Toggle */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Wind size={16} /> Environment
        </label>
        <div className="grid grid-cols-2 bg-gray-50 p-1 rounded-xl">
          <button 
            onClick={() => updateParam('environment', 'open')}
            className={`py-2 text-sm font-medium rounded-lg transition-all ${params.environment === 'open' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Open Field
          </button>
          <button 
            onClick={() => updateParam('environment', 'enclosed')}
            className={`py-2 text-sm font-medium rounded-lg transition-all ${params.environment === 'enclosed' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Enclosed
          </button>
        </div>
      </div>

    </div>
  );
};

export default LeftPanel;