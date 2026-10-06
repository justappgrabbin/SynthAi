import { create } from "zustand";
import { NPC_DATA } from "../consciousnessData";

interface NPC {
  id: string;
  name: string;
  position: number[];
  dialogues: Record<string, string[]>;
  currentDialogueIndex: number;
  isInteracting: boolean;
}

interface NPCState {
  npcs: NPC[];
  activeNPC: string | null;
  currentDialogue: string | null;
  
  // Actions
  startInteraction: (npcId: string, fieldId: string) => void;
  endInteraction: () => void;
  nextDialogue: (fieldId: string) => void;
}

export const useNPCs = create<NPCState>((set, get) => ({
  npcs: NPC_DATA.map(npc => ({
    ...npc,
    currentDialogueIndex: 0,
    isInteracting: false
  })),
  activeNPC: null,
  currentDialogue: null,
  
  startInteraction: (npcId: string, fieldId: string) => {
    const state = get();
    const npc = state.npcs.find(n => n.id === npcId);
    
    if (!npc || !npc.dialogues[fieldId]) return;
    
    const dialogues = npc.dialogues[fieldId];
    const randomDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
    
    set({
      activeNPC: npcId,
      currentDialogue: randomDialogue,
      npcs: state.npcs.map(n => 
        n.id === npcId 
          ? { ...n, isInteracting: true, currentDialogueIndex: 0 }
          : { ...n, isInteracting: false }
      )
    });
  },
  
  endInteraction: () => {
    set({
      activeNPC: null,
      currentDialogue: null,
      npcs: get().npcs.map(n => ({ ...n, isInteracting: false }))
    });
  },
  
  nextDialogue: (fieldId: string) => {
    const state = get();
    if (!state.activeNPC) return;
    
    const npc = state.npcs.find(n => n.id === state.activeNPC);
    if (!npc || !npc.dialogues[fieldId]) return;
    
    const dialogues = npc.dialogues[fieldId];
    const nextIndex = (npc.currentDialogueIndex + 1) % dialogues.length;
    const nextDialogue = dialogues[nextIndex];
    
    set({
      currentDialogue: nextDialogue,
      npcs: state.npcs.map(n => 
        n.id === state.activeNPC 
          ? { ...n, currentDialogueIndex: nextIndex }
          : n
      )
    });
  }
}));
