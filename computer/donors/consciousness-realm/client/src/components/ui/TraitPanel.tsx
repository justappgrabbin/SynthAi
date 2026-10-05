import { useEffect } from "react";
import { useTraits } from "../../lib/stores/useTraits";
import { useConsciousness } from "../../lib/stores/useConsciousness";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Progress } from "./progress";
import { X, Star, Clock } from "lucide-react";

export default function TraitPanel() {
  const { isTraitPanelOpen, toggleTraitPanel, useTrait } = useTraits();
  const { getActiveField, getFieldTraits, energeticSignature } = useConsciousness();
  
  // Handle ESC key to close panel
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && isTraitPanelOpen) {
        toggleTraitPanel();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isTraitPanelOpen, toggleTraitPanel]);
  
  if (!isTraitPanelOpen) return null;
  
  const activeField = getActiveField();
  const availableTraits = activeField ? getFieldTraits(activeField.id) : [];
  
  const handleUseTrait = (traitId: string) => {
    const success = useTrait(traitId);
    if (success) {
      console.log(`Successfully used trait: ${traitId}`);
    }
  };
  
  const isTraitUsable = (trait: any) => {
    const now = Date.now();
    return (now - trait.lastUsed) >= trait.cooldown;
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-black/90 border-2 text-white" 
            style={{ borderColor: activeField?.color || '#666' }}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl">
            {activeField?.name} Field Traits
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTraitPanel}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="overflow-y-auto">
          {/* Energetic Signature Info */}
          <div className="mb-4 p-3 bg-blue-900/30 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">Today's Energetic Signature</h3>
            <div className="flex flex-wrap gap-1">
              {energeticSignature.map((traitId) => (
                <Badge key={traitId} variant="outline" className="text-xs">
                  {traitId.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Only traits matching your energetic signature are available for use.
            </p>
          </div>
          
          {/* Available Traits */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Available Traits ({availableTraits.length})</h3>
            
            {availableTraits.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No traits resonate with your current energetic signature.
                Visit ritual zones or complete quests to expand your signature.
              </p>
            ) : (
              availableTraits.map((trait) => {
                const usable = isTraitUsable(trait);
                const cooldownRemaining = Math.max(0, trait.cooldown - (Date.now() - trait.lastUsed));
                
                return (
                  <Card key={trait.id} className="bg-gray-800/50 border-gray-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{trait.name}</h4>
                          <Badge variant={trait.type === 'major' ? 'default' : 'secondary'}>
                            {trait.type}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: trait.level }, (_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          disabled={!usable}
                          onClick={() => handleUseTrait(trait.id)}
                          className="min-w-[80px]"
                        >
                          {usable ? 'Use' : (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.ceil(cooldownRemaining / 1000)}s
                            </div>
                          )}
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-300 mb-3">{trait.description}</p>
                      
                      {/* Trait XP Progress */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>XP Progress</span>
                          <span>{trait.experience}/50 (Level {trait.level}/{trait.maxLevel})</span>
                        </div>
                        <Progress 
                          value={(trait.experience % 50) * 2} 
                          className="h-1"
                        />
                      </div>
                      
                      {/* Trait Effects */}
                      <div className="flex flex-wrap gap-1">
                        {trait.effects.map((effect: any, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {effect.type}: +{((effect.value - 1) * 100).toFixed(0)}%
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
          
          {/* Instructions */}
          <div className="mt-6 p-3 bg-gray-800/30 rounded-lg">
            <p className="text-xs text-gray-400">
              <strong>Controls:</strong> Press T to toggle this panel • 
              Use traits to gain XP and unlock upgrades • 
              Visit ritual zones to switch consciousness fields
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
