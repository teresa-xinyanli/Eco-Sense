
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Html, Line, Points, PointMaterial, Float, Billboard, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { EnvParams, TreeState, SpatialMetrics, VisualizationMode, getColorForEmotion } from '../types';
import { X, Activity, Droplets, Zap, Thermometer, ScanLine } from 'lucide-react';

interface TreeVisualizerProps {
  mode: VisualizationMode;
  params: EnvParams;
  treeState: TreeState;
  spatial?: SpatialMetrics | null;
  variant?: 'solid' | 'particles'; 
  isMuted: boolean;
}

const COUNT = 3500; 
const ENV_COUNT = 1500; // Increased count for better atmosphere
const TRUNK_COLOR = "#5D4037";

// --- Sub-Component: Environmental Particle System ---
const EnvironmentalSystem: React.FC<{ params: EnvParams, spatial?: SpatialMetrics | null, emotionColor: string }> = ({ params, spatial, emotionColor }) => {
  const points = useRef<THREE.Points>(null);

  // 1. Determine Weather/Atmosphere Configuration
  const config = useMemo(() => {
    // Base State
    let type = 'FLOAT'; 
    let baseColor = new THREE.Color('#ffffff');
    let speed = 0.5;
    let size = 0.05;
    let opacity = 0.4;
    let windVector = new THREE.Vector3(0, 0, 0);
    let turbulence = 0.1;

    // --- A. Weather Logic ---
    if (params.temperature < 5) {
      type = 'SNOW';
      baseColor.set('#e0f7fa');
      speed = 0.3;
      windVector.set(0.2, -0.8, 0); // Gentle fall with drift
      size = 0.07;
      opacity = 0.8;
    } else if (params.humidity > 75) {
      type = 'RAIN';
      baseColor.set('#81d4fa');
      speed = 3.0; // Fast
      windVector.set(0.1, -3.0, 0);
      size = 0.04;
      opacity = 0.5;
    } else if (params.temperature > 30) {
      type = 'HEAT';
      baseColor.set('#ffcc80');
      speed = 1.0;
      windVector.set(0, 1.0, 0); // Rising heat
      turbulence = 0.5; // High shimmering
      size = 0.08;
      opacity = 0.3;
    } else if (params.light > 80) {
      type = 'SUN_MOTES';
      baseColor.set('#fff59d'); // Bright yellow/white
      speed = 0.2;
      size = 0.06;
      opacity = 0.6;
      turbulence = 0.2;
    } else {
      // Default: Dust/Pollen
      type = 'DUST';
      baseColor.set('#eceff1');
      speed = 0.2;
      size = 0.04;
      opacity = 0.3;
      turbulence = 0.3;
    }

    // --- B. Spatial Context Modifiers ---
    if (spatial?.isStreetSide) {
      // Pollution / Smog
      baseColor.lerp(new THREE.Color('#546e7a'), 0.5); // Gray-Blue tint
      opacity += 0.2;
      turbulence += 0.2; // Traffic turbulence
      windVector.x += 0.5; // Street draft
    }
    
    if (spatial?.isEnclosed) {
       // Stagnant or Swirling air (Vortex effect handled in loop)
       speed *= 0.5; 
       turbulence *= 0.5;
    } else {
       // Open field = more wind
       windVector.x += (Math.random() - 0.5) * 0.5;
    }

    // --- C. Emotional Tint & Behavior ---
    // The environment "feels" the tree's emotion
    const eColor = new THREE.Color(emotionColor);
    baseColor.lerp(eColor, 0.15); // Subtle tint

    const s = spatial?.scientificAnalysis?.toLowerCase() || ""; 
    // If emotion is high energy (Stress/Joy), particles move faster
    // If low energy (Calm/Tired), particles slow down
    // We use emotionColor to guess intensity roughly or pass explicit state. 
    // Using color brightness as proxy for "energy" or checking known emotions if we had state here. 
    // We'll rely on the passed emotionColor tint for visual feedback mainly.

    return { type, color: baseColor, speed, size, opacity, windVector, turbulence };
  }, [params, spatial, emotionColor]);

  // 2. Generate Initial Positions & Data
  const [positions, particleData] = useMemo(() => {
    const pos = new Float32Array(ENV_COUNT * 3);
    const data = new Float32Array(ENV_COUNT * 4); // [phase, speedMod, radius, angle]

    for (let i = 0; i < ENV_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const r = 2.0 + Math.random() * 5.0; // Wide field around tree
      const x = Math.cos(theta) * r;
      const y = (Math.random() - 0.5) * 12; // Vertical column
      const z = Math.sin(theta) * r;

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      data[i * 4] = Math.random() * Math.PI * 2; // Phase
      data[i * 4 + 1] = 0.5 + Math.random(); // Speed Modifier
      data[i * 4 + 2] = r; // Store radius for vortex math
      data[i * 4 + 3] = theta; // Store angle
    }
    return [pos, data];
  }, []);

  // 3. Physics & Animation Loop
  useFrame((state) => {
    if (!points.current) return;
    const time = state.clock.getElapsedTime();
    const posAttr = points.current.geometry.attributes.position;
    
    for (let i = 0; i < ENV_COUNT; i++) {
      const idx = i * 3;
      const dataIdx = i * 4;
      
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);

      const phase = particleData[dataIdx];
      const speedMod = particleData[dataIdx + 1];
      const initialR = particleData[dataIdx + 2];
      const initialTheta = particleData[dataIdx + 3];

      // --- Movement Logic ---
      
      // 1. Base Weather Vector (Rain/Snow/Heat Rise)
      x += config.windVector.x * config.speed * speedMod * 0.02;
      y += config.windVector.y * config.speed * speedMod * 0.02;
      z += config.windVector.z * config.speed * speedMod * 0.02;

      // 2. Turbulence / Brownian Motion
      const noise = Math.sin(time * config.speed + phase);
      x += Math.cos(time * 0.5 + phase) * config.turbulence * 0.01;
      z += Math.sin(time * 0.3 + phase) * config.turbulence * 0.01;

      // 3. Special Effects based on Spatial Context
      if (spatial?.isEnclosed) {
          // Vortex / Swirl Effect for enclosed spaces
          const angle = initialTheta + time * 0.2 * config.speed;
          // Gentle swirl around center
          const targetX = Math.cos(angle) * initialR;
          const targetZ = Math.sin(angle) * initialR;
          x += (targetX - x) * 0.02;
          z += (targetZ - z) * 0.02;
      } 
      
      // 4. Heat Haze Specifics
      if (config.type === 'HEAT') {
         x += Math.sin(y * 2 + time * 2) * 0.02; // Wavy heat lines
      }

      // --- Boundary Reset ---
      // If particles leave the visible box, wrap them around
      if (y < -6) {
          y = 6;
          x = Math.cos(initialTheta) * initialR + (Math.random() - 0.5);
          z = Math.sin(initialTheta) * initialR + (Math.random() - 0.5);
      } else if (y > 6) {
          y = -6;
          x = Math.cos(initialTheta) * initialR + (Math.random() - 0.5);
          z = Math.sin(initialTheta) * initialR + (Math.random() - 0.5);
      }
      
      if (x > 8) x = -8;
      if (x < -8) x = 8;

      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  });

  return (
    <Points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <PointMaterial
        transparent
        color={config.color}
        size={config.size}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={config.opacity}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
};

// --- Sub-Component: 3D Selection Reticle ---
const SelectionReticle: React.FC<{ position: [number, number, number], color: string }> = ({ position, color }) => {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (outerRef.current) {
      outerRef.current.rotation.z = time * 0.5;
      outerRef.current.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
    }
    if (innerRef.current) {
      innerRef.current.rotation.z = -time * 1.5;
    }
  });

  return (
    <group position={position}>
       {/* Outer Ring */}
       <Ring ref={outerRef} args={[0.15, 0.18, 32]} rotation={[0, 0, 0]}>
         <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
       </Ring>
       {/* Inner Ring */}
       <Ring ref={innerRef} args={[0.08, 0.1, 4]} rotation={[0, 0, 0]}>
         <meshBasicMaterial color="white" transparent opacity={0.8} side={THREE.DoubleSide} />
       </Ring>
       {/* Connecting Line to UI */}
       <mesh position={[0, 0, 0]}>
         <sphereGeometry args={[0.03]} />
         <meshBasicMaterial color="white" />
       </mesh>
    </group>
  );
};

// --- Sub-Component: Bio-Scanner HUD ---
const BioScannerHUD: React.FC<{ 
  data: any, 
  onClose: () => void,
  position: [number, number, number] 
}> = ({ data, onClose, position }) => {
  const [progress, setProgress] = useState(0);
  const [showData, setShowData] = useState(false);

  useEffect(() => {
    let p = 0;
    const interval = setInterval(() => {
      p += 4; // Speed of scan
      if (p >= 100) {
        p = 100;
        setShowData(true);
        clearInterval(interval);
      }
      setProgress(p);
    }, 16);
    return () => clearInterval(interval);
  }, [data]); // Reset if data changes (new click)

  // Ensure position is treated safely even if passed as Vector3 accidentally
  const xVal = typeof position[0] === 'number' ? position[0] : (position as any).x || 0;
  const yVal = typeof position[1] === 'number' ? position[1] : (position as any).y || 0;

  return (
    <Html position={position} style={{ pointerEvents: 'none' }} zIndexRange={[100, 0]}>
      <div 
        className="pointer-events-auto absolute top-0 left-0 w-72 -translate-y-1/2 translate-x-8 perspective-1000"
      >
        {/* Connecting Line from Reticle */}
        <div className="absolute top-1/2 -left-8 w-8 h-[1px] bg-white/50 origin-right animate-in fade-in slide-in-from-right-2 duration-300" />

        <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl text-white font-mono transform transition-all duration-300 animate-in zoom-in-95 fade-in slide-in-from-left-4">
            
            {/* Header */}
            <div className="bg-white/5 p-3 flex justify-between items-center border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${!showData ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                <span className="text-[10px] font-bold tracking-widest uppercase text-white/90">
                  {!showData ? 'SCANNING TISSUE...' : 'BIO-METRICS ACQUIRED'}
                </span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="text-white/40 hover:text-white hover:bg-white/10 rounded p-1 transition-all"
              >
                <X size={14} /> 
              </button>
            </div>

            {/* Content Area */}
            <div className="p-4 relative min-h-[140px]">
              
              {/* Scanning State */}
              {!showData && (
                <div className="absolute inset-0 p-4 flex flex-col justify-center items-center space-y-3 bg-black/50 z-10">
                   <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 transition-all ease-linear" style={{ width: `${progress}%` }} />
                   </div>
                   <div className="flex justify-between w-full text-[9px] text-white/50 font-mono">
                      <span>ANALYZING CHLOROPHYLL...</span>
                      <span>{progress}%</span>
                   </div>
                   {/* Fake code scroll */}
                   <div className="text-[8px] text-green-500/50 font-mono w-full overflow-hidden h-8 leading-tight opacity-50">
                      x: {xVal.toFixed(2)} | y: {yVal.toFixed(2)}<br/>
                      transpiration_rate: calculating...<br/>
                      stomata_aperture: verifying...
                   </div>
                </div>
              )}

              {/* Data Display State */}
              <div className={`space-y-4 transition-opacity duration-500 ${showData ? 'opacity-100' : 'opacity-20 filter blur-sm'}`}>
                  
                  {/* Primary Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-white/5 p-2 rounded border border-white/5">
                        <div className="flex items-center gap-1 text-[9px] text-white/50 mb-1">
                           <Droplets size={10} /> WATER POTENTIAL
                        </div>
                        <div className="text-sm font-bold text-blue-300">{data.waterPotential} <span className="text-[9px] text-white/40 font-normal">MPa</span></div>
                     </div>
                     <div className="bg-white/5 p-2 rounded border border-white/5">
                        <div className="flex items-center gap-1 text-[9px] text-white/50 mb-1">
                           <Zap size={10} /> CONDUCTANCE
                        </div>
                        <div className="text-sm font-bold text-amber-300">{data.conductance} <span className="text-[9px] text-white/40 font-normal">mmol</span></div>
                     </div>
                     <div className="bg-white/5 p-2 rounded border border-white/5">
                        <div className="flex items-center gap-1 text-[9px] text-white/50 mb-1">
                           <Activity size={10} /> CHLOROPHYLL
                        </div>
                        <div className="text-sm font-bold text-emerald-300">{data.chlorophyll} <span className="text-[9px] text-white/40 font-normal">idx</span></div>
                     </div>
                     <div className="bg-white/5 p-2 rounded border border-white/5">
                        <div className="flex items-center gap-1 text-[9px] text-white/50 mb-1">
                           <Thermometer size={10} /> LEAF TEMP
                        </div>
                        <div className="text-sm font-bold text-red-300">{data.temp} <span className="text-[9px] text-white/40 font-normal">°C</span></div>
                     </div>
                  </div>

                  {/* Efficiency Bar */}
                  <div className="pt-2 border-t border-white/10">
                     <div className="flex justify-between items-end mb-1">
                        <span className="text-[9px] text-white/60 font-bold tracking-wider">PHOTOSYNTHETIC EFFICIENCY</span>
                        <span className="text-[10px] text-white font-bold">{data.efficiency}%</span>
                     </div>
                     <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${data.efficiency > 70 ? 'bg-gradient-to-r from-emerald-500 to-green-300' : 'bg-gradient-to-r from-yellow-500 to-red-400'}`} 
                          style={{ width: `${data.efficiency}%` }} 
                        />
                     </div>
                  </div>

              </div>
            </div>
        </div>
      </div>
    </Html>
  );
};

// --- Sub-Component: Sound Player ---
const SoundEffect: React.FC<{ emotionalStatus: string, isMuted: boolean }> = ({ emotionalStatus, isMuted }) => {
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (isMuted) return;
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const status = emotionalStatus.toLowerCase();
    
    if (status.includes('anxious') || status.includes('stress')) {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 15;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 10;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();
    } else if (status.includes('calm') || status.includes('content')) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
    } else if (status.includes('joy') || status.includes('thriving')) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); 
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
    }

    osc.start();
    oscRef.current = osc;
    gainRef.current = gain;

    return () => {
      try {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
        ctx.close();
      } catch (e) { console.error(e) }
    };
  }, [emotionalStatus, isMuted]);

  return null;
};

// --- Sub-Component: Archive/Blueprint Linkage ---
const ArchiveLink: React.FC<{ 
  start: [number, number, number], 
  end: [number, number, number], 
  label: string, 
  subLabel: string, 
  id: string 
}> = ({ start, end, label, subLabel, id }) => {
  return (
    <group>
      {/* The Line */}
      <Line 
        points={[start, end]} 
        color="white" 
        transparent 
        opacity={0.6} 
        lineWidth={1} 
      />
      
      {/* The Anchor Dot on Tree */}
      <mesh position={start}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>

      {/* The Label UI */}
      <Html position={end} style={{ pointerEvents: 'none' }}>
        <div className="w-64 -translate-y-1/2 translate-x-4">
          <div className="flex flex-col items-start">
             {/* ID Tag */}
             <div className="bg-white text-black text-[10px] font-mono px-1 mb-1 tracking-widest">
               FIG. {id}
             </div>
             
             {/* Text Block */}
             <div className="border-l border-white/40 pl-3">
               <h4 className="text-white text-xs font-bold tracking-wider uppercase mb-1 drop-shadow-md">
                 {label}
               </h4>
               <p className="text-white/80 text-[10px] font-mono leading-tight drop-shadow-md bg-black/20 p-1 backdrop-blur-sm">
                 {subLabel}
               </p>
             </div>
             
             {/* Decorative diagonal line */}
             <div className="w-full h-[1px] bg-white/20 mt-2 relative">
                <div className="absolute right-0 top-[-2px] w-1 h-1 bg-white/60 rounded-full"></div>
             </div>
          </div>
        </div>
      </Html>
    </group>
  );
};

// --- Main Component ---
const TreeVisualizer: React.FC<TreeVisualizerProps> = ({ mode, params, treeState, spatial, variant = 'solid', isMuted }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);
  
  // New State for Rich Interaction
  const [selectedLeaf, setSelectedLeaf] = useState<{
    pos: [number,number,number];
    data: any;
  } | null>(null);

  // --- 1. Generate Procedural Morphology (Particles) ---
  const [positions, colors, originalPositions, interestPoints] = useMemo(() => {
    
    const posArray = new Float32Array(COUNT * 3);
    const colArray = new Float32Array(COUNT * 3);
    const origPosArray = new Float32Array(COUNT * 3);
    
    const colorObj = new THREE.Color();
    const profile = params.canopyProfile || [0.2, 0.5, 0.8, 1.0, 0.9, 0.7, 0.4, 0.2];
    const trunkH = (params.trunkHeightRatio || 0.15) * 5.0; 
    const totalH = 5.0;
    const crownH = totalH - trunkH;
    const foliageHex = params.foliageColor || "#2d5a27";
    const trunkRatio = 0.15; 

    // Interest points for linkage
    let topPoint: [number,number,number] = [0, totalH - 1.5, 0];
    let sidePoint: [number,number,number] = [1, 2, 0];
    let rootPoint: [number,number,number] = [0, -1.5, 0];

    for (let i = 0; i < COUNT; i++) {
      let x = 0, y = 0, z = 0;
      const isTrunk = i < COUNT * trunkRatio; 

      if (isTrunk) {
        const h = Math.random() * trunkH;
        const radius = Math.random() * 0.15 + 0.05; 
        const angle = Math.random() * Math.PI * 2;
        x = Math.cos(angle) * radius;
        y = h;
        z = Math.sin(angle) * radius;
        colorObj.set(TRUNK_COLOR);
      } else {
        const hNorm = Math.random(); 
        const yPos = trunkH + (hNorm * crownH);
        const profileIndex = Math.min(Math.floor(hNorm * profile.length), profile.length - 1);
        const widthAtHeight = profile[profileIndex];
        const rMax = widthAtHeight * 2.5; 
        const r = Math.sqrt(Math.random()) * rMax;
        const angle = Math.random() * Math.PI * 2;
        x = Math.cos(angle) * r;
        y = yPos;
        z = Math.sin(angle) * r;
        y += (Math.random() - 0.5) * 0.2; 
        
        colorObj.set(foliageHex);

        if (widthAtHeight >= 0.9 && r > 2.0) sidePoint = [x, y-1.5, z];
        if (hNorm > 0.9) topPoint = [x, y-1.5, z];
      }

      y -= 1.5;

      posArray[i * 3] = x;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = z;
      origPosArray[i*3] = x;
      origPosArray[i*3+1] = y;
      origPosArray[i*3+2] = z;
      colArray[i * 3] = colorObj.r;
      colArray[i * 3 + 1] = colorObj.g;
      colArray[i * 3 + 2] = colorObj.b;
    }
    return [posArray, colArray, origPosArray, { top: topPoint, side: sidePoint, root: rootPoint }];
  }, [params.canopyProfile, params.trunkHeightRatio, params.foliageColor]);

  // --- 2. Determine Emotion Visuals ---
  const emotionConfig = useMemo(() => {
    const s = treeState.emotionalStatus.toLowerCase();
    const targetColor = getColorForEmotion(treeState.emotionalStatus);
    
    let pulse = 1.0;
    let jitter = 0.05;
    let size = 0.15;

    if (s.includes('joy') || s.includes('thriving') || s.includes('flourishing')) {
       pulse = 2.0; jitter = 0.02; size = 0.2;
    } else if (s.includes('anx') || s.includes('stress') || s.includes('overheated') || s.includes('scorched')) {
       pulse = 10.0; jitter = 0.15; size = 0.15;
    } else if (s.includes('tired') || s.includes('sick') || s.includes('wither') || s.includes('exhausted')) {
       pulse = 0.5; jitter = 0.0; size = 0.1;
    } else if (s.includes('calm') || s.includes('content') || s.includes('balanced') || s.includes('healthy')) {
       pulse = 1.0; jitter = 0.05; size = 0.18;
    }

    return { color: targetColor, pulse, jitter, size };
  }, [treeState.emotionalStatus]);

  // --- 3. Animation Loop ---
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (positions && pointsRef.current && originalPositions) {
        const positionsAttr = pointsRef.current.geometry.attributes.position;
        const colorsAttr = pointsRef.current.geometry.attributes.color;
        
        const emotionColor = new THREE.Color(emotionConfig.color);
        const baseColor = new THREE.Color(params.foliageColor || '#2d5a27');
        const mixFactor = 0.8; 

        const finalColor = baseColor.clone().lerp(emotionColor, mixFactor);

        for (let i = 0; i < COUNT; i++) {
          const isTrunk = i < COUNT * 0.15;
          const idx = i * 3;
          let x = originalPositions[idx];
          let y = originalPositions[idx+1];
          let z = originalPositions[idx+2];

          if (!isTrunk) {
            if (emotionConfig.pulse > 0) {
               const breath = Math.sin(time * emotionConfig.pulse + x * 0.5) * 0.05;
               x += x * breath;
               y += y * breath;
               z += z * breath;
            }
            if (emotionConfig.jitter > 0) {
               x += (Math.random() - 0.5) * emotionConfig.jitter;
               y += (Math.random() - 0.5) * emotionConfig.jitter;
               z += (Math.random() - 0.5) * emotionConfig.jitter;
            }
            colorsAttr.setXYZ(i, finalColor.r, finalColor.g, finalColor.b);
          }
          positionsAttr.setXYZ(i, x, y, z);
        }
        positionsAttr.needsUpdate = true;
        colorsAttr.needsUpdate = true;
    }

    if (variant === 'solid' && groupRef.current) {
        const breath = 1 + Math.sin(time * emotionConfig.pulse) * 0.02;
        groupRef.current.scale.set(breath, breath, breath);
        groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.05;
    }
  });

  // --- TEXT MODE: 2D SMART-LAYOUT CALLIGRAM ---
  const textVolumetrics = useMemo(() => {
    if (mode !== 'TEXT') return [];

    const items: any[] = [];
    
    // Helper to get clean unique words (>3 chars)
    const getWords = (str: string) => [...new Set(str.split(/[\s,.;:]+/).filter(w => w.length > 3))];

    // Priority Words (Largest, Emotion Color)
    const priorityWords = [
        treeState.emotionalStatus,
        ...getWords(treeState.visualSignal).slice(0, 3)
    ];

    // Secondary Words (Medium, Mixed Color)
    const secondaryWords = [
        ...getWords(treeState.physiologicalState),
        ...getWords(treeState.sonicResponse).slice(0, 4)
    ];

    // Filler Words (Small, Neutral)
    const fillers = ["leaves", "shade", "wind", "rain", "sun", "carbon", "breath", "grow", "roots", "sky"];

    const profile = params.canopyProfile || [0.2, 0.4, 0.6, 0.9, 1.0, 0.8, 0.5, 0.2];
    const trunkH = (params.trunkHeightRatio || 0.15) * 5.0; 
    const totalH = 5.0;
    const crownH = totalH - trunkH;
    
    const emotionColor = getColorForEmotion(treeState.emotionalStatus);
    const neutralColor = "#9CA3AF"; // Gray-400 for structure

    // 1. TRUNK GENERATION
    // Solid vertical stack, bold
    const trunkRows = 7;
    for (let i = 0; i < trunkRows; i++) {
        const y = (i / trunkRows) * trunkH;
        items.push({
            pos: [0, y - 1.5, 0], 
            text: "STEM",
            size: 0.15,
            color: "#5D4037", 
            opacity: 1.0,
            weight: "bold"
        });
    }

    // 2. CANOPY GENERATION (Smart Row Packing)
    const canopyRows = 14; 
    
    for (let i = 0; i < canopyRows; i++) {
        const hNorm = i / canopyRows;
        const y = trunkH + (hNorm * crownH);
        
        // Determine available width for this row based on tree profile
        const profileIndex = Math.min(Math.floor(hNorm * profile.length), profile.length - 1);
        const widthFactor = profile[profileIndex];
        const maxRowWidth = widthFactor * 3.2; // Multiplier to spread words out

        // Skip very narrow rows at the absolute bottom or top if not enough space
        if (maxRowWidth < 0.3) continue;

        let currentWidth = 0;
        const rowWords: any[] = [];
        const gap = 0.15; // Gap between words

        // Attempt to pack words into the row
        let safety = 0;
        while (currentWidth < maxRowWidth && safety < 10) {
            safety++;
            
            // Randomly select word type
            // Higher rows (top of tree) get more light/airy words? 
            // We just randomize for now, prioritizing emotion
            let word = "";
            let type = "filler"; 
            
            const rand = Math.random();
            if (rand > 0.7 && priorityWords.length > 0) {
                word = priorityWords[Math.floor(Math.random() * priorityWords.length)];
                type = "priority";
            } else if (rand > 0.4 && secondaryWords.length > 0) {
                word = secondaryWords[Math.floor(Math.random() * secondaryWords.length)];
                type = "secondary";
            } else {
                word = fillers[Math.floor(Math.random() * fillers.length)];
                type = "filler";
            }

            // Assign Size based on importance
            let fontSize = 0.1;
            if (type === "priority") fontSize = 0.20 + (Math.random() * 0.05);
            else if (type === "secondary") fontSize = 0.12 + (Math.random() * 0.03);
            else fontSize = 0.09;

            // Estimate Word Width (Approximate for proportional font)
            // Average char width factor ~0.6 * fontSize
            const wordWidth = word.length * fontSize * 0.55;

            // Check fit
            if (currentWidth + wordWidth > maxRowWidth) break;

            // Assign Color
            let color = neutralColor;
            let opacity = 0.6;
            
            if (type === "priority") {
                color = emotionColor;
                opacity = 1.0;
            } else if (type === "secondary") {
                // Secondary words sometimes pick up the emotion color
                if (Math.random() > 0.5) color = emotionColor;
                opacity = 0.8;
            }

            rowWords.push({
                text: word,
                size: fontSize,
                width: wordWidth,
                color: color,
                opacity: opacity
            });

            currentWidth += wordWidth + gap;
        }

        // Center the row
        // Starting X is half of the used width to the left
        let startX = -currentWidth / 2;
        
        rowWords.forEach(w => {
            // Position is center of the word
            const posX = startX + (w.width / 2);
            items.push({
                pos: [posX, y - 1.5, 0],
                text: w.text,
                size: w.size,
                color: w.color,
                opacity: w.opacity
            });
            startX += w.width + gap;
        });
    }

    return items;
  }, [mode, treeState, params]);

  const handleLeafClick = (e: any) => {
    if (mode !== 'LEAF') return;
    e.stopPropagation();
    
    // e.point is a Vector3 in R3F, we MUST convert to array for state to match BioScannerHUD expectation
    // and avoid "undefined.toFixed" errors on Vector3 usage as array.
    const point = e.point;
    const x = point.x;
    const y = point.y;
    const z = point.z;

    // Simulate Biology Data based on Height and Emotion
    const yPos = y;
    const isStressed = treeState.emotionalStatus.includes('Stress') || treeState.emotionalStatus.includes('Anx');
    const isHappy = treeState.emotionalStatus.includes('Thriv') || treeState.emotionalStatus.includes('Content');

    // Water Potential: Drops as we go higher (gravity)
    // Range: -0.5 (Base) to -2.0 (Top). Stressed trees have lower potential.
    let wpBase = -0.5 - (yPos * 0.3); 
    if (isStressed) wpBase -= 0.8;
    
    // Conductance: Random variation
    let cond = Math.random() * 5 + 2; 
    if (isHappy) cond += 4; // High conductance = open stomata
    if (isStressed) cond = Math.max(0.5, cond - 3); // Closed stomata

    // Chlorophyll Index
    let chl = 30 + Math.random() * 20;
    if (isHappy) chl += 15;
    
    const newData = {
      waterPotential: wpBase.toFixed(2),
      conductance: cond.toFixed(1),
      chlorophyll: Math.floor(chl),
      efficiency: Math.min(99, Math.floor(isHappy ? 85 + Math.random()*10 : 40 + Math.random()*30)),
      temp: (params.temperature + (Math.random() * 2 - 1)).toFixed(1)
    };

    setSelectedLeaf({
      pos: [x, y, z],
      data: newData
    });
  };

  return (
    <group position={[0, -2, 0]} onClick={(e) => {
        // Clear selection if clicking outside
        if (mode === 'LEAF' && selectedLeaf) {
            // Check distance to see if it was a distinct click away
            // For now, simple logic: clicking background handles this in parent, 
            // but clicking 'solid' geometry might bubble here. 
        }
    }}> 
      
      {(mode === 'SOUND' || mode === 'SHADER') && <SoundEffect emotionalStatus={treeState.emotionalStatus} isMuted={isMuted} />}
      
      {/* ENVIRONMENTAL SYSTEM (New dynamic layer based on weather/pollution/light) */}
      <EnvironmentalSystem 
        params={params} 
        spatial={spatial} 
        emotionColor={emotionConfig.color}
      />

      {/* PARTICLES */}
      {variant === 'particles' && positions && colors && mode !== 'TEXT' && (
         <Points 
          ref={pointsRef} 
          positions={positions} 
          colors={colors} 
          // We moved the main click handler to the invisible mesh below for better UX
          // But keep this as a fallback if needed
        >
          <PointMaterial
            transparent
            vertexColors
            size={mode === 'POINTS' ? 0.04 : emotionConfig.size} 
            sizeAttenuation={true}
            depthWrite={false}
            opacity={mode === 'POINTS' ? 0.8 : 0.7}
            blending={THREE.AdditiveBlending}
          />
        </Points>
      )}

      {/* SOLID MESH */}
      {variant === 'solid' && (
        <group ref={groupRef} visible={mode !== 'TEXT'}>
           <mesh position={[0, 1.5, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.4, 3, 8]} />
              <meshStandardMaterial color="#5D4037" />
           </mesh>
           <Float speed={2} rotationIntensity={0.1} floatIntensity={0.1}>
            <mesh position={[0, 3.2, 0]} castShadow onClick={handleLeafClick}
             onPointerOver={() => { if(mode === 'LEAF') document.body.style.cursor = 'crosshair'; }}
             onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
              <dodecahedronGeometry args={[1.5, 0]} />
              <meshStandardMaterial color={emotionConfig.color} emissive={emotionConfig.color} emissiveIntensity={0.2} roughness={0.8} />
            </mesh>
          </Float>
        </group>
      )}

      {/* INVISIBLE HIT VOLUME (FUZZY SELECTION FIX) */}
      {/* This ensures user can click anywhere near the canopy to trigger analysis */}
      {mode === 'LEAF' && (
        <mesh 
          position={[0, 3.5, 0]} 
          onClick={handleLeafClick}
          onPointerOver={() => document.body.style.cursor = 'crosshair'}
          onPointerOut={() => document.body.style.cursor = 'auto'}
        >
            <sphereGeometry args={[2.5, 32, 32]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} color="hotpink" />
        </mesh>
      )}

      {/* TEXT MODE: 2D BILLBOARDED CALLIGRAM */}
      {mode === 'TEXT' && (
        // Wrap entire group in Billboard so the "Paper" always faces the viewer
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false} castShadow={false} receiveShadow={false}>
          <group castShadow={false} receiveShadow={false}>
             {textVolumetrics.map((item, i) => (
                 <Text 
                   key={i}
                   position={item.pos}
                   fontSize={item.size} 
                   color={item.color} 
                   fillOpacity={item.opacity}
                   anchorX="center"
                   anchorY="middle"
                   font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
                   castShadow={false}
                   receiveShadow={false}
                 >
                   {item.text}
                 </Text>
             ))}
          </group>
        </Billboard>
      )}

      {/* LINKAGE MODE */}
      {mode === 'LINKAGE' && interestPoints && (
         <group>
            <ArchiveLink 
               start={interestPoints.top} 
               end={[interestPoints.top[0] + 1.5, interestPoints.top[1] + 1.5, interestPoints.top[2]]} 
               id="01"
               label="Canopy Analysis"
               subLabel={`Efficiency: ${params.light > 50 ? 'High' : 'Low'}\nTarget: Photosynthesis`}
            />

            <ArchiveLink 
               start={interestPoints.side} 
               end={[interestPoints.side[0] + 2, interestPoints.side[1], interestPoints.side[2] + 1]} 
               id="02"
               label="Visual Signal"
               subLabel={`Status: ${treeState.visualSignal.split(' ').slice(0, 3).join(' ')}...\nProfile: ${params.crownShape}`}
            />

            <ArchiveLink 
               start={interestPoints.root} 
               end={[interestPoints.root[0] - 2, interestPoints.root[1] + 0.5, interestPoints.root[2] + 1]} 
               id="03"
               label="Rhizosphere"
               subLabel={`Soil: ${spatial?.hasPavement ? 'Compacted/Sealed' : 'Permeable'}\nStress: ${spatial?.hasPavement ? 'CRITICAL' : 'Normal'}`}
            />
         </group>
      )}

      {/* INTERACTIVE LEAF SELECTION & HUD */}
      {mode === 'LEAF' && selectedLeaf && (
         <group>
            {/* 3D Reticle at Click Position */}
            <SelectionReticle position={selectedLeaf.pos} color={emotionConfig.color} />
            
            {/* Floating Glass HUD */}
            <BioScannerHUD 
               data={selectedLeaf.data} 
               position={selectedLeaf.pos} 
               onClose={() => setSelectedLeaf(null)}
            />
         </group>
      )}

    </group>
  );
};

export default TreeVisualizer;
