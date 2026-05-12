
import React, { useState } from 'react';
import { TreeState, SpatialMetrics, getColorForEmotion } from '../types';
import { Heart, Activity, Music, Eye, Building2, Car, Footprints, Wind, FlaskConical, ChevronDown, ChevronUp, ZapOff } from 'lucide-react';

interface RightPanelProps {
  state: TreeState;
  spatial?: SpatialMetrics | null;
  isLoading: boolean;
  history?: string[];
}

const RightPanel: React.FC<RightPanelProps> = ({ state, spatial, isLoading, history = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardBaseClass = "bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3 min-h-[140px] transition-all duration-500";
  const labelClass = "text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase flex items-center gap-2";

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
      
      {/* Emotional Status */}
      <div className={cardBaseClass}>
        <div className={labelClass}>
          <Heart size={14} className="text-red-400" /> Emotional Status
        </div>
        <div className="flex-1 flex items-center">
          {isLoading ? (
             <div className="h-8 w-24 bg-gray-100 rounded animate-pulse"/>
          ) : (
            <span className="bg-gray-100 px-4 py-2 rounded-full font-serif text-2xl text-gray-800">
                {state.emotionalStatus}
            </span>
          )}
        </div>
      </div>

      {/* Physiological State */}
      <div className={cardBaseClass}>
        <div className={labelClass}>
          <Activity size={14} className="text-blue-400" /> Physiological State
        </div>
        <div className="flex-1 text-sm text-gray-800 leading-relaxed font-medium">
          {isLoading ? <div className="space-y-2"><div className="h-3 w-3/4 bg-gray-100 rounded animate-pulse"/><div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse"/></div> : state.physiologicalState}
        </div>
      </div>

      {/* Spatial Context Analysis (New Layer) */}
      {spatial && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 shadow-inner flex flex-col gap-3 transition-all duration-300">
           <div 
             className="flex justify-between items-center cursor-pointer group select-none"
             onClick={() => setIsExpanded(!isExpanded)}
           >
             <div className={labelClass}>
               <FlaskConical size={14} className="text-slate-500" /> Spatial Context Analysis
             </div>
             <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
               {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </div>
           </div>
           
           {/* Tags */}
           <div className="flex flex-wrap gap-2">
              <span className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${spatial.hasBuildingProximity ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50'}`}>
                 <Building2 size={12} /> Shade
              </span>
              <span className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${spatial.isStreetSide ? 'bg-red-100 text-red-800 border-red-200' : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50'}`}>
                 <Car size={12} /> Pollution
              </span>
              <span className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${spatial.hasPavement ? 'bg-stone-100 text-stone-800 border-stone-200' : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50'}`}>
                 <Footprints size={12} /> Compaction
              </span>
              <span className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${spatial.isEnclosed ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-gray-100 text-gray-400 border-gray-200 opacity-50'}`}>
                 <Wind size={12} /> Enclosed
              </span>
           </div>

           {/* Analysis Text */}
           {isExpanded && (
             <div className="text-xs text-slate-600 leading-relaxed italic border-t border-slate-200 pt-2 mt-1 animate-fade-in">
                {isLoading ? "Analyzing spatial stressors..." : spatial.scientificAnalysis}
             </div>
           )}
        </div>
      )}

      {/* Sonic Response */}
      <div className={cardBaseClass}>
        <div className={labelClass}>
          <Music size={14} className="text-purple-400" /> Sonic Response
        </div>
        <div className="flex-1 flex items-start gap-3">
           <div className="flex gap-1 items-end h-6 mt-1">
             <div className="w-1 bg-purple-200 h-2 animate-bounce" style={{ animationDelay: '0ms' }}></div>
             <div className="w-1 bg-purple-300 h-4 animate-bounce" style={{ animationDelay: '100ms' }}></div>
             <div className="w-1 bg-purple-200 h-3 animate-bounce" style={{ animationDelay: '200ms' }}></div>
           </div>
           <p className="text-sm italic text-gray-600">
             "{isLoading ? 'Analyzing...' : state.sonicResponse}"
           </p>
        </div>
      </div>

      {/* Visual Signal */}
      <div className={cardBaseClass}>
        <div className={labelClass}>
          <Eye size={14} className="text-green-500" /> Visual Signal
        </div>
        <div className="flex-1 flex items-start gap-4">
            <div 
              className="w-6 h-8 rounded-full shrink-0 mt-1 opacity-80 transition-colors duration-700 shadow-sm border border-gray-100"
              style={{ backgroundColor: isLoading ? '#e5e7eb' : getColorForEmotion(state.emotionalStatus) }}
            ></div>
            <p className="text-xs text-gray-600 leading-relaxed">
             {isLoading ? 'Calculating...' : state.visualSignal}
           </p>
        </div>
      </div>

      {/* Narrative Archive (History) */}
      {history.length > 1 && (
        <div className="bg-gray-100/50 rounded-2xl p-5 flex flex-col gap-3">
           <div className={labelClass}>
             <Activity size={14} className="text-gray-400" /> Narrative Archive
           </div>
           <div className="space-y-3">
              {history.slice(1).map((reflection, idx) => (
                <div key={idx} className="text-[10px] text-gray-500 leading-tight border-l-2 border-gray-200 pl-2 py-1">
                   "{reflection}"
                </div>
              ))}
           </div>
        </div>
      )}

    </div>
  );
};

export default RightPanel;
