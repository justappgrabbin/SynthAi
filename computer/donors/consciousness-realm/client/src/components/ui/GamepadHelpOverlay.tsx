import { useEffect, useState } from "react";

export default function GamepadHelpOverlay() {
  const [showGamepadHelp, setShowGamepadHelp] = useState(false);
  const [isGamepadConnected, setIsGamepadConnected] = useState(false);

  useEffect(() => {
    const checkGamepad = () => {
      const gamepads = navigator.getGamepads();
      const hasGamepad = Array.from(gamepads).some(gamepad => gamepad !== null);
      setIsGamepadConnected(hasGamepad);
    };

    const handleGamepadConnected = () => {
      setIsGamepadConnected(true);
      setShowGamepadHelp(true);
      setTimeout(() => setShowGamepadHelp(false), 5000); // Show for 5 seconds
    };

    const handleGamepadDisconnected = () => {
      setIsGamepadConnected(false);
      setShowGamepadHelp(false);
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
    
    // Check initially
    checkGamepad();

    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
    };
  }, []);

  if (!showGamepadHelp) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg border border-purple-500/50 z-50">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-green-400 font-semibold">Controller Connected</span>
      </div>
      
      <div className="space-y-1 text-sm">
        <div><span className="text-purple-300">Left Stick/D-Pad:</span> Move</div>
        <div><span className="text-purple-300">A Button:</span> Interact</div>
        <div><span className="text-purple-300">B Button:</span> Jump</div>
        <div><span className="text-purple-300">Y Button:</span> Open Traits</div>
      </div>
    </div>
  );
}