import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { CONSCIOUSNESS_FIELDS, type ConsciousnessField } from "../consciousnessData";

interface ConsciousnessState {
  activeField: string;
  fields: ConsciousnessField[];
  switchCooldown: number;
  lastSwitchTime: number;
  energeticSignature: string[];
  totalExperience: number;
  questsCompleted: number;
  
  // Actions
  switchField: (fieldId: string) => boolean;
  gainExperience: (fieldId: string, amount: number) => void;
  gainTraitExperience: (fieldId: string, traitId: string, amount: number) => void;
  updateEnergeticSignature: () => void;
  canUseField: (fieldId: string) => boolean;
  getActiveField: () => ConsciousnessField | undefined;
  getFieldTraits: (fieldId: string) => any[];
  unlockField: (fieldId: string) => boolean;
  checkFieldUnlocks: () => void;
  completeQuest: (questName: string) => void;
}

export const useConsciousness = create<ConsciousnessState>()(
  subscribeWithSelector((set, get) => ({
    activeField: 'mind',
    fields: [...CONSCIOUSNESS_FIELDS],
    switchCooldown: 30000, // 30 seconds
    lastSwitchTime: 0,
    energeticSignature: ['mind_analysis', 'heart_empathy', 'body_strength'],
    totalExperience: 0,
    questsCompleted: 0,
    
    switchField: (fieldId: string) => {
      const state = get();
      const now = Date.now();
      
      // Check if field exists and is unlocked
      const field = state.fields.find(f => f.id === fieldId);
      if (!field || !field.unlocked) {
        console.log(`Cannot switch to field ${fieldId}: not found or locked`);
        return false;
      }
      
      // Check cooldown
      if (now - state.lastSwitchTime < state.switchCooldown && state.activeField !== fieldId) {
        console.log(`Field switch on cooldown: ${Math.ceil((state.switchCooldown - (now - state.lastSwitchTime)) / 1000)}s remaining`);
        return false;
      }
      
      set({
        activeField: fieldId,
        lastSwitchTime: now
      });
      
      console.log(`Switched to field: ${field.name}`);
      return true;
    },
    
    gainExperience: (fieldId: string, amount: number) => {
      set((state) => {
        const newTotalExp = state.totalExperience + amount;
        const updatedFields = state.fields.map(field => {
          if (field.id === fieldId) {
            const newExp = field.experience + amount;
            const newLevel = Math.floor(newExp / 100) + 1;
            return {
              ...field,
              experience: newExp,
              level: Math.max(field.level, newLevel)
            };
          }
          return field;
        });
        
        return {
          fields: updatedFields,
          totalExperience: newTotalExp
        };
      });
      
      // Check for field unlocks after gaining experience
      get().checkFieldUnlocks();
    },
    
    gainTraitExperience: (fieldId: string, traitId: string, amount: number) => {
      set((state) => ({
        fields: state.fields.map(field => {
          if (field.id === fieldId) {
            return {
              ...field,
              traits: field.traits.map(trait => {
                if (trait.id === traitId) {
                  const newExp = trait.experience + amount;
                  const newLevel = Math.min(
                    Math.floor(newExp / 50) + 1,
                    trait.maxLevel
                  );
                  return {
                    ...trait,
                    experience: newExp,
                    level: Math.max(trait.level, newLevel)
                  };
                }
                return trait;
              })
            };
          }
          return field;
        })
      }));
    },
    
    // The phone bridge supplies real profile addresses; never randomize identity.
    updateEnergeticSignature: () => {},
    
    canUseField: (fieldId: string) => {
      const field = get().fields.find(f => f.id === fieldId);
      return field ? field.unlocked : false;
    },
    
    getActiveField: () => {
      const state = get();
      return state.fields.find(f => f.id === state.activeField);
    },
    
    getFieldTraits: (fieldId: string) => {
      const field = get().fields.find(f => f.id === fieldId);
      if (!field) return [];
      
      const signature = get().energeticSignature;
      return field.traits.filter(trait => signature.includes(trait.id));
    },
    
    unlockField: (fieldId: string) => {
      const state = get();
      const field = state.fields.find(f => f.id === fieldId);
      
      if (!field || field.unlocked) return false;
      
      set({
        fields: state.fields.map(f => 
          f.id === fieldId ? { ...f, unlocked: true } : f
        )
      });
      
      console.log(`Unlocked consciousness field: ${field.name}`);
      return true;
    },
    
    checkFieldUnlocks: () => {
      const state = get();
      const { totalExperience, questsCompleted } = state;
      
      // Unlock criteria for each field
      const unlockCriteria = {
        child: totalExperience >= 500,
        shadow: totalExperience >= 800 && questsCompleted >= 2,
        will: totalExperience >= 1200 && questsCompleted >= 3,
        soul: totalExperience >= 2000 && questsCompleted >= 5,
        spirit: totalExperience >= 3000 && questsCompleted >= 7,
        synthesis: totalExperience >= 5000 && questsCompleted >= 10
      };
      
      Object.entries(unlockCriteria).forEach(([fieldId, canUnlock]) => {
        if (canUnlock) {
          state.unlockField(fieldId);
        }
      });
    },
    
    completeQuest: (questName: string) => {
      set((state) => ({
        questsCompleted: state.questsCompleted + 1
      }));
      
      console.log(`Quest completed: ${questName}`);
      get().checkFieldUnlocks();
    }
  }))
);
