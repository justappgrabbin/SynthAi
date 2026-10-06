import { PhoneBridge, TouchControls } from "./phone/PhoneBridge";
import { usePhone, EMPTY_THEME } from "./phone/PhoneBridge";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { KeyboardControls } from "@react-three/drei";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Game from "./components/game/Game";
import FieldResonanceHUD from "./components/ui/FieldResonanceHUD";
import TraitPanel from "./components/ui/TraitPanel";
import DialogueBox from "./components/ui/DialogueBox";
import QuestSystem from "./components/ui/QuestSystem";
import GameInstructions from "./components/ui/GameInstructions";
import ExperienceNotification from "./components/ui/ExperienceNotification";
import GamepadHelpOverlay from "./components/ui/GamepadHelpOverlay";
import "@fontsource/inter";
import "./index.css";

const queryClient = new QueryClient();

// Define control keys for the game
enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  interact = 'interact',
  openTraits = 'openTraits',
  jump = 'jump'
}

const controls = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.interact, keys: ["KeyE"] },
  { name: Controls.openTraits, keys: ["KeyT"] },
  { name: Controls.jump, keys: ["Space"] },
];

function App() {
  const atmosphere = usePhone((state: any) => state.session?.world?.contract?.hostExpression?.atmosphere ?? EMPTY_THEME);
  const background = atmosphere.background ?? '#160c29';
  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
        <KeyboardControls map={controls}>
          <PhoneBridge />
          <TouchControls />
          <Canvas
            shadows
            camera={{
              position: [0, 8, 12],
              fov: 45,
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              powerPreference: "high-performance"
            }}
          >
            <color attach="background" args={[background]} />
            <fogExp2 attach="fog" args={[background, atmosphere.fog ?? .018]} />
            
            <Suspense fallback={null}>
              <Game />
            </Suspense>
          </Canvas>
          
          {/* UI Overlay */}
          <ExperienceNotification />
          <FieldResonanceHUD />
          <TraitPanel />
          <DialogueBox />
          <QuestSystem />
          <GameInstructions />
          <GamepadHelpOverlay />
        </KeyboardControls>
      </div>
    </QueryClientProvider>
  );
}

export default App;
