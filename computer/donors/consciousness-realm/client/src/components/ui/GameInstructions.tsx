import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { X, Keyboard, Mouse, Eye, Heart, Brain, Zap } from "lucide-react";

export default function GameInstructions() {
  const [isVisible, setIsVisible] = useState(false);
  
  // Show instructions on first load
  useEffect(() => {
    const hasSeenInstructions = localStorage.getItem('consciousness-game-instructions');
    if (!hasSeenInstructions) {
      setIsVisible(true);
    }
  }, []);
  
  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('consciousness-game-instructions', 'true');
  };
  
  // Keyboard shortcut to toggle instructions
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'KeyH') {
        setIsVisible(prev => !prev);
      }
      if (event.code === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);
  
  if (!isVisible) {
    return (
      <div className="fixed top-20 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-black/80 border-white/20 text-white hover:bg-white/20"
        >
          Help (H)
        </Button>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-black/95 border-2 border-blue-500 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl text-blue-400">
            Consciousness Fields - Game Guide
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="overflow-y-auto space-y-6">
          {/* Game Concept */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Game Concept
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Explore nine fields of consciousness, each offering unique perspectives and abilities. 
              Start with Mind, Heart, and Body fields unlocked. Gain experience, complete quests, 
              and unlock Child, Shadow, Will, Soul, Spirit, and Synthesis fields as you progress.
            </p>
          </div>
          
          {/* Controls */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-green-300 flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Controls
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">WASD</Badge>
                  <span className="text-sm">Movement · phone: arrow pad</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">E</Badge>
                  <span className="text-sm">Interact with NPCs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">T</Badge>
                  <span className="text-sm">Open Traits Panel</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">Q</Badge>
                  <span className="text-sm">Open Quest Panel</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">Space</Badge>
                  <span className="text-sm">Jump</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">H</Badge>
                  <span className="text-sm">Toggle Help</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">ESC</Badge>
                  <span className="text-sm">Close Dialogs</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Consciousness Fields */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-purple-300 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Consciousness Fields
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-400">Starting Fields (Unlocked)</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-blue-300">Mind:</span> Logic, analysis, strategy</div>
                  <div><span className="text-red-300">Heart:</span> Emotion, empathy, connection</div>
                  <div><span className="text-yellow-600">Body:</span> Physical strength, instinct</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-400">Advanced Fields (Locked)</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-yellow-300">Child:</span> Wonder, creativity, innocence</div>
                  <div><span className="text-purple-300">Shadow:</span> Hidden aspects, integration</div>
                  <div><span className="text-orange-300">Will:</span> Manifestation, determination</div>
                  <div><span className="text-pink-300">Soul:</span> Essence, eternal purpose</div>
                  <div><span className="text-cyan-300">Spirit:</span> Transcendence, unity</div>
                  <div><span className="text-white">Synthesis:</span> Perfect integration</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Gameplay Systems */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-yellow-300 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Key Systems
            </h3>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-green-400 mb-1">Ritual Zones</h4>
                <p className="text-sm text-gray-300">
                  Walk into glowing ritual zones to switch consciousness fields. 
                  Each zone has a 30-second cooldown between switches.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-400 mb-1">Energetic Signature</h4>
                <p className="text-sm text-gray-300">
                  Your daily energetic signature determines which traits you can use. 
                  Signatures update automatically and change which abilities are available.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-1">Trait System</h4>
                <p className="text-sm text-gray-300">
                  Use traits to gain experience and unlock upgrades. Each trait has cooldowns 
                  and levels up with use, becoming more powerful over time.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-red-400 mb-1">NPC Dialogues</h4>
                <p className="text-sm text-gray-300">
                  NPCs respond differently based on your active consciousness field. 
                  Each field unlocks unique dialogue options and perspectives.
                </p>
              </div>
            </div>
          </div>
          
          {/* Tips */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-orange-300 flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Pro Tips
            </h3>
            <ul className="space-y-1 text-sm text-gray-300">
              <li>• Experiment with different consciousness fields to see how they change your experience</li>
              <li>• Pay attention to your energetic signature - it determines which traits you can access</li>
              <li>• Complete quests to unlock new consciousness fields and expand your abilities</li>
              <li>• Talk to NPCs in different fields to discover unique dialogue and wisdom</li>
              <li>• Use traits regularly to level them up and increase their effectiveness</li>
              <li>• The Synthesis field represents the ultimate goal of unified consciousness</li>
            </ul>
          </div>
          
          <div className="mt-6 p-4 bg-blue-900/30 rounded-lg border border-blue-600/30">
            <p className="text-sm text-blue-200 text-center">
              This is a consciousness exploration game. Take your time, experiment, 
              and discover how different states of awareness change your experience of the world.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}