import { useState, useEffect } from "react";
import { useConsciousness } from "../../lib/stores/useConsciousness";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { CheckCircle, Circle, Star } from "lucide-react";

interface Quest {
  id: string;
  name: string;
  description: string;
  requirements: string;
  reward: string;
  completed: boolean;
  progress: number;
  maxProgress: number;
}

const INITIAL_QUESTS: Quest[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Begin your consciousness journey by gaining experience in any field',
    requirements: 'Gain 100 total experience',
    reward: 'Unlocks Child field',
    completed: false,
    progress: 0,
    maxProgress: 100
  },
  {
    id: 'field_master',
    name: 'Field Master',
    description: 'Master the basic consciousness fields',
    requirements: 'Reach level 3 in Mind, Heart, and Body fields',
    reward: 'Unlocks Shadow field',
    completed: false,
    progress: 0,
    maxProgress: 3
  },
  {
    id: 'trait_explorer',
    name: 'Trait Explorer',
    description: 'Discover the power of consciousness traits',
    requirements: 'Use 10 different traits',
    reward: 'Unlocks Will field',
    completed: false,
    progress: 0,
    maxProgress: 10
  },
  {
    id: 'wisdom_seeker',
    name: 'Wisdom Seeker',
    description: 'Learn from the ancient NPCs',
    requirements: 'Have 20 conversations with NPCs',
    reward: 'Unlocks Soul field',
    completed: false,
    progress: 0,
    maxProgress: 20
  },
  {
    id: 'consciousness_adept',
    name: 'Consciousness Adept',
    description: 'Achieve deep understanding across multiple fields',
    requirements: 'Reach level 5 in any consciousness field',
    reward: 'Unlocks Spirit field',
    completed: false,
    progress: 0,
    maxProgress: 5
  },
  {
    id: 'unity_seeker',
    name: 'Unity Seeker',
    description: 'Prepare for the ultimate integration',
    requirements: 'Unlock and experience all individual fields',
    reward: 'Unlocks Synthesis field',
    completed: false,
    progress: 0,
    maxProgress: 8
  }
];

export default function QuestSystem() {
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const [isQuestPanelOpen, setIsQuestPanelOpen] = useState(false);
  const { totalExperience, fields, completeQuest } = useConsciousness();
  
  // Update quest progress based on game state
  useEffect(() => {
    setQuests(prevQuests => 
      prevQuests.map(quest => {
        let newProgress = quest.progress;
        let completed = quest.completed;
        
        switch (quest.id) {
          case 'first_steps':
            newProgress = Math.min(totalExperience, quest.maxProgress);
            completed = totalExperience >= quest.maxProgress;
            break;
          case 'field_master':
            const basicFields = fields.filter(f => ['mind', 'heart', 'body'].includes(f.id));
            newProgress = basicFields.filter(f => f.level >= 3).length;
            completed = newProgress >= quest.maxProgress;
            break;
          case 'consciousness_adept':
            const maxLevel = Math.max(...fields.map(f => f.level));
            newProgress = Math.min(maxLevel, quest.maxProgress);
            completed = maxLevel >= quest.maxProgress;
            break;
          case 'unity_seeker':
            const unlockedFields = fields.filter(f => f.unlocked).length;
            newProgress = Math.min(unlockedFields, quest.maxProgress);
            completed = unlockedFields >= quest.maxProgress;
            break;
        }
        
        // Complete quest if not already completed
        if (completed && !quest.completed) {
          completeQuest(quest.name);
        }
        
        return { ...quest, progress: newProgress, completed };
      })
    );
  }, [totalExperience, fields, completeQuest]);
  
  // Keyboard shortcut to toggle quest panel
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'KeyQ') {
        setIsQuestPanelOpen(prev => !prev);
      }
      if (event.code === 'Escape' && isQuestPanelOpen) {
        setIsQuestPanelOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isQuestPanelOpen]);
  
  const completedQuests = quests.filter(q => q.completed).length;
  const totalQuests = quests.length;
  
  return (
    <>
      {/* Quest Toggle Button */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => setIsQuestPanelOpen(!isQuestPanelOpen)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          Quests ({completedQuests}/{totalQuests})
        </Button>
      </div>
      
      {/* Quest Panel */}
      {isQuestPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-black/90 border-2 border-purple-500 text-white">
            <CardHeader>
              <CardTitle className="text-xl text-purple-400">
                Consciousness Quests
              </CardTitle>
              <p className="text-sm text-gray-400">
                Complete quests to unlock new consciousness fields and abilities
              </p>
            </CardHeader>
            
            <CardContent className="overflow-y-auto space-y-4">
              {quests.map((quest) => (
                <Card key={quest.id} className={`${
                  quest.completed 
                    ? 'bg-green-900/30 border-green-600' 
                    : 'bg-gray-800/50 border-gray-700'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {quest.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400" />
                        )}
                        <h4 className="font-semibold">{quest.name}</h4>
                        {quest.completed && (
                          <Badge variant="secondary" className="bg-green-600">
                            Complete
                          </Badge>
                        )}
                      </div>
                      <Star className="h-4 w-4 text-yellow-400" />
                    </div>
                    
                    <p className="text-sm text-gray-300 mb-2">{quest.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Requirements:</span>
                        <span>{quest.requirements}</span>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Progress:</span>
                        <span>{quest.progress}/{quest.maxProgress}</span>
                      </div>
                      
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            quest.completed ? 'bg-green-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${(quest.progress / quest.maxProgress) * 100}%` }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Reward:</span>
                        <span className="text-yellow-400">{quest.reward}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <div className="mt-6 p-3 bg-purple-900/30 rounded-lg">
                <p className="text-xs text-gray-400">
                  <strong>Controls:</strong> Press Q to toggle quest panel • 
                  Complete quests to unlock new consciousness fields • 
                  Each field offers unique traits and abilities
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}