import { useEffect, useRef, useState } from "react";

interface GamepadState {
  forward: boolean;
  backward: boolean;
  leftward: boolean;
  rightward: boolean;
  interact: boolean;
  openTraits: boolean;
  jump: boolean;
}

export function useGamepadControls() {
  const [gamepadState, setGamepadState] = useState<GamepadState>({
    forward: false,
    backward: false,
    leftward: false,
    rightward: false,
    interact: false,
    openTraits: false,
    jump: false
  });
  
  const gamepadRef = useRef<Gamepad | null>(null);
  const animationFrameRef = useRef<number>();
  
  useEffect(() => {
    const handleGamepadConnected = (event: GamepadEvent) => {
      console.log(`Gamepad connected: ${event.gamepad.id}`);
      gamepadRef.current = event.gamepad;
    };
    
    const handleGamepadDisconnected = (event: GamepadEvent) => {
      console.log(`Gamepad disconnected: ${event.gamepad.id}`);
      gamepadRef.current = null;
    };
    
    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
    
    const pollGamepad = () => {
      const gamepads = navigator.getGamepads();
      const gamepad = gamepads[0]; // Use first connected gamepad
      
      if (gamepad) {
        const deadzone = 0.2;
        
        // Left stick for movement
        const leftStickX = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
        const leftStickY = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;
        
        // Map gamepad inputs to game controls
        const newState: GamepadState = {
          forward: leftStickY < -deadzone || gamepad.buttons[12]?.pressed || false, // Up on D-pad
          backward: leftStickY > deadzone || gamepad.buttons[13]?.pressed || false, // Down on D-pad
          leftward: leftStickX < -deadzone || gamepad.buttons[14]?.pressed || false, // Left on D-pad
          rightward: leftStickX > deadzone || gamepad.buttons[15]?.pressed || false, // Right on D-pad
          interact: gamepad.buttons[0]?.pressed || false, // A button (Xbox) / X button (PlayStation)
          openTraits: gamepad.buttons[3]?.pressed || false, // Y button (Xbox) / Triangle button (PlayStation)
          jump: gamepad.buttons[1]?.pressed || false // B button (Xbox) / Circle button (PlayStation)
        };
        
        setGamepadState(newState);
      }
      
      animationFrameRef.current = requestAnimationFrame(pollGamepad);
    };
    
    // Start polling
    pollGamepad();
    
    return () => {
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return gamepadState;
}