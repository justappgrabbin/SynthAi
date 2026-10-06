import { usePhone, publishRealmEvent } from "../../phone/PhoneBridge";
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "@react-three/drei";
import * as THREE from "three";
import Avatar from "./Avatar";
import { useConsciousness } from "../../lib/stores/useConsciousness";
import { useNPCs } from "../../lib/stores/useNPCs";
import { useGamepadControls } from "../../hooks/useGamepadControls";

enum Controls {
  forward = 'forward',
  backward = 'backward',
  leftward = 'leftward',
  rightward = 'rightward',
  interact = 'interact',
  openTraits = 'openTraits',
  jump = 'jump'
}

export default function Player() {
  const playerRef = useRef<THREE.Group>(null);
  const lastReport = useRef(0);
  const velocityRef = useRef(new THREE.Vector3());
  const [subscribe, getState] = useKeyboardControls<Controls>();
  const gamepadState = useGamepadControls();
  const { camera } = useThree();
  const { activeField, getActiveField, getFieldTraits } = useConsciousness();
  const { startInteraction, npcs } = useNPCs();
  
  const moveSpeed = 5;
  const jumpPower = 8;
  const gravity = -20;
  const groundLevel = 1;
  
  // Handle interactions (keyboard and gamepad)
  useEffect(() => {
    const unsubscribeInteract = subscribe(
      (state) => state.interact,
      (pressed) => {
        if (pressed && playerRef.current) {
          handleInteraction();
        }
      }
    );
    
    return unsubscribeInteract;
  }, [subscribe, activeField, npcs, startInteraction]);
  
  useEffect(() => {
    const interact = () => handleInteraction();
    window.addEventListener('realm-interact', interact);
    return () => window.removeEventListener('realm-interact', interact);
  }, [activeField, npcs, startInteraction]);

  // Handle gamepad interactions
  useEffect(() => {
    if (gamepadState.interact && playerRef.current) {
      handleInteraction();
    }
  }, [gamepadState.interact, activeField, npcs, startInteraction]);
  
  const handleInteraction = () => {
    if (!playerRef.current) return;
    
    // Check for nearby NPCs
    const playerPos = playerRef.current.position;
    const objectAction = usePhone.getState().interactObject;
    if (objectAction?.(playerPos.toArray())) return;
    const nearbyNPC = npcs.find(npc => {
      const npcPos = new THREE.Vector3(...npc.position);
      const distance = playerPos.distanceTo(npcPos);
      return distance < 3; // Interaction range
    });
    
    if (nearbyNPC) {
      startInteraction(nearbyNPC.id, activeField);
      usePhone.getState().setMotion("talk");
      publishRealmEvent({ type: "interaction", target: nearbyNPC.id, action: 'talk', field: activeField });
      
      // Gain experience from NPC interactions
      const { gainExperience } = useConsciousness.getState();
      gainExperience(activeField, 25);
      
      console.log(`Interacting with ${nearbyNPC.name} as ${activeField} - gained 25 XP`);
    }
  };
  
  useFrame((state, delta) => {
    if (!playerRef.current) return;
    
    // Combine keyboard and gamepad inputs
    const keyboardControls = getState();
    const touch = usePhone.getState().controls;
    const controls = {
      forward: keyboardControls.forward || gamepadState.forward || touch.forward,
      backward: keyboardControls.backward || gamepadState.backward || touch.backward,
      leftward: keyboardControls.leftward || gamepadState.leftward || touch.leftward,
      rightward: keyboardControls.rightward || gamepadState.rightward || touch.rightward,
      jump: keyboardControls.jump || gamepadState.jump || touch.jump
    };
    
    const player = playerRef.current;
    const velocity = velocityRef.current;
    const activeFieldData = getActiveField();
    
    // Calculate movement based on active field traits
    let speedMultiplier = 1;
    if (activeFieldData) {
      const traits = getFieldTraits(activeFieldData.id);
      const strengthTrait = traits.find(t => t.id.includes('strength') || t.id.includes('agility'));
      if (strengthTrait) {
        const movementEffect = strengthTrait.effects.find((e: any) => e.type === 'movement');
        if (movementEffect) {
          speedMultiplier = movementEffect.value;
        }
      }
    }
    
    const currentMoveSpeed = moveSpeed * speedMultiplier;
    
    // Handle horizontal movement
    const moveVector = new THREE.Vector3();
    
    if (controls.forward) moveVector.z -= 1;
    if (controls.backward) moveVector.z += 1;
    if (controls.leftward) moveVector.x -= 1;
    if (controls.rightward) moveVector.x += 1;
    
    if (moveVector.length() > 0 && !usePhone.getState().seat) {
      moveVector.normalize().multiplyScalar(currentMoveSpeed * delta);
      player.position.add(moveVector);
    }
    
    if (usePhone.getState().seat) player.position.set(...usePhone.getState().seat);
    const motion = usePhone.getState().contextualMotion ?? (moveVector.length() > 0 ? 'walk' : useNPCs.getState().activeNPC ? 'talk' : 'idle');
    if (usePhone.getState().motion !== motion) usePhone.getState().setMotion(motion);
    if (state.clock.elapsedTime - lastReport.current >= 2) {
      lastReport.current = state.clock.elapsedTime;
      publishRealmEvent({ type: 'movement', position: player.position.toArray(), motion, field: activeField });
    }

    // Handle jumping
    if (controls.jump && player.position.y <= groundLevel + 0.1) {
      velocity.y = jumpPower;
    }
    
    // Apply gravity
    velocity.y += gravity * delta;
    player.position.y += velocity.y * delta;
    
    // Ground collision
    if (player.position.y < groundLevel) {
      player.position.y = groundLevel;
      velocity.y = 0;
    }
    usePhone.getState().setPosition(player.position.toArray());
    
    // Update camera to follow player
    const idealCameraPosition = new THREE.Vector3(
      player.position.x,
      player.position.y + 8,
      player.position.z + 12
    );
    
    camera.position.lerp(idealCameraPosition, 2 * delta);
    camera.lookAt(player.position);
    
    // Log position for debugging
    if (Math.floor(state.clock.elapsedTime) % 5 === 0 && Math.floor(state.clock.elapsedTime * 10) % 10 === 0) {
      console.log(`Player position: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`);
    }
  });
  
  return (
    <group ref={playerRef} position={[0, groundLevel, 0]}>
      <Avatar />
    </group>
  );
}
