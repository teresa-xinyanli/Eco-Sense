
import React, { useState, useRef, useMemo, Suspense, useEffect } from 'react';
import { ViewMode, EnvParams, TreeState, UserLocation, SpatialMetrics, VisualizationMode } from '../types';
import { Box, Map, Camera, ScanLine, Upload, Loader2, Info, AlertTriangle, X, Image as ImageIcon, CheckCircle2, Eye, Compass, Sparkles, Volume2, Fingerprint, Type, Share2, Grid, ArrowLeft } from 'lucide-react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { analyzeTreeImage, analyzeStreetView } from '../services/geminiService';
import TreeVisualizer from './TreeVisualizer';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

interface CenterPanelProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isLoading: boolean;
  params: EnvParams;
  setParams: React.Dispatch<React.SetStateAction<EnvParams>>;
  treeState: TreeState;
  setTreeState?: React.Dispatch<React.SetStateAction<TreeState>>;
  spatialMetrics?: SpatialMetrics | null;
  setSpatialMetrics?: React.Dispatch<React.SetStateAction<SpatialMetrics | null>>;
  userLocation: UserLocation | null;
}

// --- Toolbar Component ---
const VizToolbar: React.FC<{ mode: VisualizationMode, setMode: (m: VisualizationMode) => void }> = ({ mode, setMode }) => {
  const items: { id: VisualizationMode, label: string, icon: React.FC<any> }[] = [
    { id: 'SHADER', label: 'SHADER', icon: Eye },
    { id: 'SOUND', label: 'SOUND', icon: Volume2 },
    { id: 'LEAF', label: 'TOUCH', icon: Fingerprint },
    { id: 'TEXT', label: 'TEXT', icon: Type },
    { id: 'LINKAGE', label: 'LINKS', icon: Share2 },
    { id: 'POINTS', label: 'POINTS', icon: Grid },
  ];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#f3f4f6] px-3 py-2 rounded-[2rem] flex items-center gap-2 shadow-2xl z-30 border border-white/50 overflow-x-auto max-w-[95%] animate-in slide-in-from-bottom-4 fade-in duration-300">
      {items.map((item) => {
        const isSelected = mode === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setMode(item.id)}
            className={`
              flex flex-col items-center justify-center gap-1 w-[4.5rem] h-[4.5rem] rounded-2xl transition-all duration-200
              ${isSelected 
                ? 'bg-[#FFF8E7] text-[#8B4513] border-2 border-black/80 shadow-sm scale-105' 
                : 'text-gray-500 hover:bg-white hover:text-gray-700 border-2 border-transparent'}
            `}
          >
            <item.icon size={22} strokeWidth={isSelected ? 2.5 : 2} />
            <span className={`text-[9px] font-bold tracking-widest ${isSelected ? 'font-extrabold' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// --- 3D Components ---

const UserModel: React.FC<{ url: string }> = ({ url }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={2} position={[0, -1, 0]} />;
};

const Scene: React.FC<{ 
  params: EnvParams, 
  treeState: TreeState, 
  spatial?: SpatialMetrics | null, 
  userModelUrl: string | null,
  vizMode: VisualizationMode 
}> = ({ params, treeState, spatial, userModelUrl, vizMode }) => {
  const lightIntensity = (params.light / 100) * 2; 

  return (
    <>
      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 4} 
        maxPolarAngle={Math.PI / 2} 
        enableZoom={true} 
        minDistance={3}
        maxDistance={12}
      />

      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={lightIntensity} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#b3e5fc" />
      
      <Stars radius={100} depth={50} count={params.light < 20 ? 5000 : 0} factor={4} saturation={0} fade speed={1} />
      
      {userModelUrl ? (
        <Suspense fallback={<TreeVisualizer mode={vizMode} params={params} treeState={treeState} spatial={spatial} variant="solid" />}>
           <UserModel url={userModelUrl} />
        </Suspense>
      ) : (
        // Standard Stylized View -> Solid Variant
        <TreeVisualizer mode={vizMode} params={params} treeState={treeState} spatial={spatial} variant="solid" />
      )}

      <ContactShadows opacity={0.4} scale={10} blur={2.5} far={4} color="#000000" />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]} receiveShadow>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#e5e7eb" transparent opacity={0.2} />
      </mesh>
    </>
  );
};

// --- Google Maps Street View Component ---

const StreetView: React.FC<{ 
  apiKey: string; 
  lat: number; 
  lng: number; 
  onAnalyze: (pov: {heading: number, pitch: number}, loc: {lat: number, lng: number}) => void;
  isAnalyzing: boolean;
}> = ({ apiKey, lat, lng, onAnalyze, isAnalyzing }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initStreetView = () => {
      if (!containerRef.current || !(window as any).google) return;
      
      const google = (window as any).google;
      const loc = { lat, lng };
      
      try {
        if (!panoramaRef.current) {
          panoramaRef.current = new google.maps.StreetViewPanorama(containerRef.current, {
            position: loc,
            pov: { heading: 0, pitch: 10 },
            zoom: 1,
            disableDefaultUI: false,
            addressControl: false,
            fullscreenControl: false,
            motionTracking: false,
            linksControl: true,
            panControl: true,
            enableCloseButton: false,
            showRoadLabels: false,
          });
        } else {
          panoramaRef.current.setPosition(loc);
        }
      } catch (err) {
        console.error("Street View Init Error:", err);
        setError("Failed to initialize Street View.");
      }
    };

    (window as any).gm_authFailure = () => {
      setError("Google Maps authentication failed.");
    };

    if (!(window as any).google?.maps) {
      if (!document.querySelector('#google-maps-script')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onload = () => initStreetView();
        script.onerror = () => setError("Failed to load Google Maps script.");
        document.head.appendChild(script);
      } else {
        const script = document.querySelector('#google-maps-script') as HTMLScriptElement;
        script.addEventListener('load', initStreetView);
      }
    } else {
      initStreetView();
    }
  }, [apiKey, lat, lng]);

  const handleScanClick = () => {
    if (panoramaRef.current) {
      const pov = panoramaRef.current.getPov();
      const pos = panoramaRef.current.getPosition();
      onAnalyze(
        { heading: pov.heading, pitch: pov.pitch }, 
        { lat: pos.lat(), lng: pos.lng() }
      );
    }
  };

  if (error) {
     return (
       <div className="w-full h-full flex items-center justify-center bg-gray-100 text-center p-6">
         <div className="max-w-md bg-white p-6 rounded-xl shadow-sm border border-red-100">
           <div className="flex justify-center mb-3"><AlertTriangle className="text-red-500" size={32} /></div>
           <p className="text-sm text-gray-600 leading-relaxed">{error}</p>
         </div>
       </div>
     );
  }

  return (
    <div className="w-full h-full relative group">
      <div ref={containerRef} className="w-full h-full bg-gray-200" />
      
      {/* Visual Analysis Controls - Moved higher to avoid collision with Toolbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
         <button 
            onClick={handleScanClick}
            disabled={isAnalyzing}
            className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-xl backdrop-blur-md transition-all transform hover:scale-105 ${
              isAnalyzing 
                ? 'bg-gray-800/80 text-gray-300 cursor-wait' 
                : 'bg-white/90 text-green-700 hover:bg-white font-semibold'
            }`}
         >
            {isAnalyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Analyzing Spatial Context...</span>
              </>
            ) : (
              <>
                <Eye size={18} />
                <span>Analyze View</span>
              </>
            )}
         </button>
         {!isAnalyzing && (
            <div className="text-[10px] text-white bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
               Align view with tree & click
            </div>
         )}
      </div>
      
      <div className="absolute top-4 right-4 pointer-events-none">
          <span className="bg-black/60 text-white px-3 py-1 rounded-full text-xs backdrop-blur-md shadow-lg flex items-center gap-2">
              <Compass size={12} /> Interactive
          </span>
      </div>
    </div>
  );
};

// --- Main Component ---

const CenterPanel: React.FC<CenterPanelProps> = ({ 
  viewMode, 
  setViewMode, 
  isLoading, 
  params, 
  setParams,
  treeState,
  setTreeState, 
  spatialMetrics,
  setSpatialMetrics,
  userLocation 
}) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedModelUrl, setUploadedModelUrl] = useState<string | null>(null);
  const [analysisFile, setAnalysisFile] = useState<File | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');
  
  // New State for Emotion Engine
  const [vizMode, setVizMode] = useState<VisualizationMode>('SHADER');
  const [isVisualizing, setIsVisualizing] = useState(false); // Controls the Immersive Overlay

  // Refs for file inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  // Street View Analysis Handler
  const handleStreetViewAnalyze = async (pov: {heading: number, pitch: number}, loc: {lat: number, lng: number}) => {
    setIdentifying(true);
    setStatusMessage("Analyzing buildings, pavement, and traffic context...");
    setStatusType('info');
    
    try {
      const result = await analyzeStreetView(loc.lat, loc.lng, pov.heading, pov.pitch, GOOGLE_KEY);
      
      // Update Params (Species AND estimated environment)
      setParams(prev => ({ 
        ...prev, 
        species: result.species,
        temperature: result.environment.temperature,
        humidity: result.environment.humidity,
        light: result.environment.light,
        // Update Morphological Data from Analysis
        crownShape: result.environment.crownShape,
        canopyProfile: result.environment.canopyProfile,
        trunkHeightRatio: result.environment.trunkHeightRatio,
        foliageColor: result.environment.foliageColor
      }));
      
      // Update State directly
      if (setTreeState) setTreeState(result.state);
      
      // Update Spatial Metrics directly
      if (setSpatialMetrics) setSpatialMetrics(result.spatial);

      setStatusMessage(`Complete: ${result.species} in ${result.spatial.isStreetSide ? 'Street' : 'Park'} context`);
      setStatusType('success');
      
      setTimeout(() => setStatusMessage(null), 3000);

    } catch (error) {
      console.error(error);
      setStatusMessage("Analysis failed. Try moving slightly.");
      setStatusType('error');
    } finally {
      setIdentifying(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
      const url = URL.createObjectURL(file);
      setUploadedModelUrl(url);
      setViewMode(ViewMode.STYLIZED);
    } else {
      setAnalysisFile(file);
      setStatusMessage(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setUploadedImage(e.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageAnalysis = async () => {
    if (!analysisFile) {
      setStatusMessage("No image file found. Please upload again.");
      setStatusType('error');
      return;
    }
    setIdentifying(true);
    setStatusMessage("Processing image & estimating environment...");
    setStatusType('info');

    try {
      const loc = userLocation ? { lat: userLocation.lat, lon: userLocation.lon } : undefined;
      const result = await analyzeTreeImage(analysisFile, loc);
      
      setParams(prev => ({ 
         ...prev, 
         species: result.species,
         temperature: result.environment.temperature,
         humidity: result.environment.humidity,
         light: result.environment.light,
         // Update Morphological Data from Analysis
         crownShape: result.environment.crownShape,
         canopyProfile: result.environment.canopyProfile,
         trunkHeightRatio: result.environment.trunkHeightRatio,
         foliageColor: result.environment.foliageColor
      }));
      
      if (setTreeState) setTreeState(result.state);
      if (setSpatialMetrics) setSpatialMetrics(result.spatial);

      setStatusMessage(`Analysis Complete: ${result.species}`);
      setStatusType('success');
    } catch (err: any) {
      console.error(err);
      setStatusMessage("Analysis failed. Please try again.");
      setStatusType('error');
    } finally {
      setIdentifying(false);
    }
  };

  const handleRetake = () => {
    setUploadedImage(null);
    setAnalysisFile(null);
    setStatusMessage(null);
  };

  const streetViewCoords = userLocation || { lat: 40.7812, lon: -73.9665 };

  return (
    <div className="relative h-full w-full bg-white rounded-3xl overflow-hidden shadow-sm border-4 border-white">
      {/* Top Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm">
        <button 
          onClick={() => { setViewMode(ViewMode.STYLIZED); setIsVisualizing(false); }}
          className={`p-2 rounded-md transition-colors ${viewMode === ViewMode.STYLIZED ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
          title="Stylized / 3D"
        >
          <Box size={20} />
        </button>
        <button 
          onClick={() => setViewMode(ViewMode.STREET)}
          className={`p-2 rounded-md transition-colors ${viewMode === ViewMode.STREET ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
          title="Street View"
        >
          <Map size={20} />
        </button>
        <button 
          onClick={() => { setViewMode(ViewMode.CAMERA); setIsVisualizing(false); }}
          className={`p-2 rounded-md transition-colors ${viewMode === ViewMode.CAMERA ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-100'}`}
          title="Camera / Upload"
        >
          <Camera size={20} />
        </button>
      </div>

      {/* Global Status Overlay (For Street View & Camera) */}
      {(viewMode === ViewMode.STREET && statusMessage) && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-2 text-white shadow-xl animate-fade-in z-20">
            {statusType === 'success' ? <CheckCircle2 size={18} className="text-green-400"/> : 
             statusType === 'error' ? <AlertTriangle size={18} className="text-red-400"/> : 
             <Loader2 size={18} className="animate-spin text-blue-400"/>}
            <span className="text-sm font-medium">{statusMessage}</span>
          </div>
      )}

      {/* Main Viewport Content */}
      <div className="w-full h-full bg-gradient-to-b from-gray-100 to-gray-200 relative">
        
        {/* MODE: Stylized View */}
        {viewMode === ViewMode.STYLIZED && (
          <div className="w-full h-full animate-fade-in relative">
             <Canvas shadows camera={{ position: [0, 2, 8], fov: 45 }}>
               <Scene 
                 params={params} 
                 treeState={treeState} 
                 spatial={spatialMetrics} 
                 userModelUrl={uploadedModelUrl} 
                 vizMode={vizMode}
               />
             </Canvas>
             <VizToolbar mode={vizMode} setMode={setVizMode} />
          </div>
        )}

        {/* MODE: Street View */}
        {viewMode === ViewMode.STREET && (
          <div className="w-full h-full relative bg-gray-100">
             
             {/* 1. Google Maps Layer (Always behind) */}
             <div className={`w-full h-full transition-all duration-700 ${isVisualizing ? 'filter brightness-[0.25] blur-[2px]' : ''}`}>
                <StreetView 
                    apiKey={GOOGLE_KEY}
                    lat={streetViewCoords.lat}
                    lng={streetViewCoords.lon}
                    onAnalyze={handleStreetViewAnalyze}
                    isAnalyzing={identifying}
                />
             </div>

             {/* 2. Controls when NOT visualizing */}
             {!isVisualizing && (
                <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20">
                   <button 
                     onClick={() => setIsVisualizing(true)}
                     className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-full shadow-2xl font-serif text-lg flex items-center gap-3 transition-transform hover:scale-105 animate-in slide-in-from-bottom-8 fade-in"
                   >
                      <Sparkles size={20} />
                      Visualize Emotion
                   </button>
                </div>
             )}

             {/* 3. Immersive Overlay Mode */}
             {isVisualizing && (
                <>
                   {/* Exit Button */}
                   <div className="absolute top-4 left-44 z-30 animate-in fade-in">
                      <button 
                        onClick={() => setIsVisualizing(false)}
                        className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium border border-white/20 flex items-center gap-2"
                      >
                         <ArrowLeft size={14} /> Exit Immersion
                      </button>
                   </div>

                   {/* AR Canvas */}
                   {/* Removed pointer-events-none to allow rotation. Added OrbitControls. */}
                   <div className="absolute inset-0 z-20">
                      <Canvas alpha={true} camera={{ position: [0, 2, 8], fov: 45 }}>
                          <ambientLight intensity={0.5} />
                          <directionalLight position={[5, 10, 5]} intensity={1} />
                          
                          <OrbitControls 
                            enableZoom={true} 
                            enablePan={false} 
                            minDistance={2} 
                            maxDistance={15} 
                          />

                          <Suspense fallback={null}>
                             {/* Render the Particle System ('particles') for Street View Overlay */}
                             <TreeVisualizer mode={vizMode} params={params} treeState={treeState} spatial={spatialMetrics} variant="particles" />
                          </Suspense>
                      </Canvas>
                   </div>

                   {/* Toolbar */}
                   <VizToolbar mode={vizMode} setMode={setVizMode} />
                </>
             )}
          </div>
        )}

        {/* MODE: Camera / Upload */}
        {viewMode === ViewMode.CAMERA && (
          <div className="w-full h-full flex flex-col items-center justify-center relative bg-[#0f172a] p-4">
             {uploadedImage ? (
               <>
                 <img src={uploadedImage} alt="Uploaded" className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
                 {statusMessage && (
                   <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-2 text-white shadow-xl animate-fade-in z-20">
                      {statusType === 'success' ? <CheckCircle2 size={18} className="text-green-400"/> : 
                       statusType === 'error' ? <AlertTriangle size={18} className="text-red-400"/> : 
                       <Loader2 size={18} className="animate-spin text-blue-400"/>}
                      <span className="text-sm font-medium">{statusMessage}</span>
                   </div>
                 )}
                 <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3 w-full max-w-sm justify-center px-4">
                   <button onClick={handleRetake} className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md px-6 py-3 rounded-full text-sm font-medium transition-all flex-1 border border-white/10">Retake</button>
                   <button onClick={handleImageAnalysis} disabled={identifying} className={`shadow-lg px-6 py-3 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all flex-[2] ${identifying ? 'bg-gray-500 cursor-not-allowed text-white' : 'bg-green-600 hover:bg-green-500 text-white'}`}>
                     {identifying ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                     {identifying ? 'Analyzing...' : 'Analyze Tree & Context'}
                   </button>
                 </div>
               </>
             ) : (
               <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl animate-fade-in relative">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="serif text-2xl text-gray-900">Add Input</h3>
                     <button onClick={() => setViewMode(ViewMode.STYLIZED)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                     <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 md:p-6 border-2 border-dashed border-purple-100 bg-purple-50/50 rounded-2xl hover:bg-purple-50 hover:border-purple-300 transition-all group">
                        <div className="bg-white p-3 rounded-full shadow-sm mb-3 text-purple-600 group-hover:scale-110 transition-transform"><ScanLine size={24} /></div>
                        <span className="font-semibold text-gray-800 text-sm md:text-base">Real World Tree</span>
                        <span className="text-[10px] md:text-xs text-gray-500 mt-1">Camera Analysis</span>
                        <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileUpload} />
                     </button>
                     <button onClick={() => modelInputRef.current?.click()} className="flex flex-col items-center justify-center p-4 md:p-6 border-2 border-dashed border-blue-100 bg-blue-50/50 rounded-2xl hover:bg-blue-50 hover:border-blue-300 transition-all group">
                        <div className="bg-white p-3 rounded-full shadow-sm mb-3 text-blue-600 group-hover:scale-110 transition-transform"><Box size={24} /></div>
                        <span className="font-semibold text-gray-800 text-sm md:text-base">3D Model</span>
                        <span className="text-[10px] md:text-xs text-gray-500 mt-1">Upload .glb / .obj</span>
                        <input type="file" ref={modelInputRef} accept=".glb,.gltf" className="hidden" onChange={handleFileUpload} />
                     </button>
                  </div>
                   <button onClick={() => galleryInputRef.current?.click()} className="w-full text-xs text-gray-400 hover:text-gray-600 font-medium py-2 flex items-center justify-center gap-2 transition-colors">
                        <ImageIcon size={14} /> Or just upload background image
                        <input type="file" ref={galleryInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
                     </button>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterPanel;
