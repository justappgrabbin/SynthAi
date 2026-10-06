import { useFrame } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import { useEffect } from "react";
import Player from "./Player";
import Terrain from "./Terrain";
import RitualZone from "./RitualZone";
import NPCSystem from "./NPCSystem";
import ParticleEffects from "./ParticleEffects";
import { useConsciousness } from "../../lib/stores/useConsciousness";
import { useTraits } from "../../lib/stores/useTraits";
import { useAudio } from "../../lib/stores/useAudio";
import { RITUAL_ZONES } from "../../lib/consciousnessData";
import { usePhone, EMPTY_THEME } from '../../phone/PhoneBridge';
import { WorldSwarm } from '../../phone/WorldSwarm';
import { WorldObjects } from '../../phone/WorldObjects';
import { RequestedWorld } from '../../phone/ProceduralMorph';

enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  interact = 'interact',
  openTraits = 'openTraits',
  jump = 'jump'
}

export default function Game() {
  const appearance = usePhone((state: any) => state.session?.world?.contract?.hostExpression?.atmosphere ?? EMPTY_THEME);
  const requestedArchitecture = usePhone((state: any) => state.session?.world?.contract?.hostExpression?.architecture?.kind);
  const [subscribe, getState] = useKeyboardControls<Controls>();
  const { toggleTraitPanel } = useTraits();
  const { updateEnergeticSignature } = useConsciousness();
  
  // Initialize audio
  useEffect(() => {
    const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio.getState();
    
    // Load background music
    const bgMusic = new Audio('/realm/sounds/background.mp3');
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    setBackgroundMusic(bgMusic);
    
    // Load sound effects
    const hitSound = new Audio('/realm/sounds/hit.mp3');
    const successSound = new Audio('/realm/sounds/success.mp3');
    setHitSound(hitSound);
    setSuccessSound(successSound);
    
    // Update energetic signature periodically (simulate daily change)
    const signatureInterval = setInterval(() => {
      updateEnergeticSignature();
    }, 60000); // Every minute for demo purposes
    
    return () => clearInterval(signatureInterval);
  }, [updateEnergeticSignature]);
  
  // Handle keyboard controls
  useEffect(() => {
    const unsubscribeTraits = subscribe(
      (state) => state.openTraits,
      (pressed) => {
        if (pressed) {
          toggleTraitPanel();
        }
      }
    );
    
    return () => {
      unsubscribeTraits();
    };
  }, [subscribe, toggleTraitPanel]);
  
  // Game loop
  useFrame(() => {
    // This is where we'd handle continuous game logic
    // For now, just log controls for debugging
    const controls = getState();
    if (controls.forward || controls.backward || controls.leftward || controls.rightward) {
      // Movement is handled in Player component
    }
  });
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <WorldSwarm />
      <RequestedWorld />
      <WorldObjects />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        color={appearance.light ?? '#ffffff'}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[0, 10, 0]} intensity={0.5} color="#ffffff" />
      
      {/* Game World */}
      <Terrain />
      
      {/* Ritual Zones */}
      {!requestedArchitecture && RITUAL_ZONES.map((zone) => (
        <RitualZone
          key={zone.id}
          position={zone.position as [number, number, number]}
          fieldId={zone.fieldId}
          name={zone.name}
        />
      ))}
      
      {/* NPCs */}
      <NPCSystem />
      
      {/* Player */}
      <Player />
      
      {/* Particle Effects */}
      <ParticleEffects />
    </>
  );
}
