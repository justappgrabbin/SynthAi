import { create } from "zustand";
import { useConsciousness } from "./useConsciousness";

interface TraitState {
  isTraitPanelOpen: boolean;
  selectedTrait: string | null;
  
  // Actions
  toggleTraitPanel: () => void;
  selectTrait: (traitId: string | null) => void;
  useTrait: (traitId: string) => boolean;
}

export const useTraits = create<TraitState>((set, get) => ({
  isTraitPanelOpen: false,
  selectedTrait: null,
  
  toggleTraitPanel: () => {
    set((state) => ({ isTraitPanelOpen: !state.isTraitPanelOpen }));
  },
  
  selectTrait: (traitId: string | null) => {
    set({ selectedTrait: traitId });
  },
  
  useTrait: (traitId: string) => {
    const consciousness = useConsciousness.getState();
    const activeField = consciousness.getActiveField();
    
    if (!activeField) return false;
    
    const trait = activeField.traits.find(t => t.id === traitId);
    if (!trait) return false;
    
    const now = Date.now();
    const canUse = now - trait.lastUsed >= trait.cooldown;
    
    if (!canUse) {
      console.log(`Trait ${trait.name} on cooldown`);
      return false;
    }
    
    // Mark trait as used
    consciousness.gainTraitExperience(activeField.id, traitId, 10);
    
    // Update last used time
    const updatedFields = consciousness.fields.map(field => {
      if (field.id === activeField.id) {
        return {
          ...field,
          traits: field.traits.map(t => 
            t.id === traitId ? { ...t, lastUsed: now } : t
          )
        };
      }
      return field;
    });
    
    useConsciousness.setState({ fields: updatedFields });
    
    console.log(`Used trait: ${trait.name}`);
    return true;
  }
}));
