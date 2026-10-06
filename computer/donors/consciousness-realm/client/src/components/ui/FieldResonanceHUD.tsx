import { useConsciousness } from "../../lib/stores/useConsciousness";
import { Card, CardContent } from "./card";
import { Badge } from "./badge";
import { Progress } from "./progress";

export default function FieldResonanceHUD() {
  const { activeField, getActiveField, switchCooldown, lastSwitchTime } = useConsciousness();
  
  const field = getActiveField();
  const now = Date.now();
  const timeUntilSwitch = Math.max(0, switchCooldown - (now - lastSwitchTime));
  const cooldownProgress = ((switchCooldown - timeUntilSwitch) / switchCooldown) * 100;
  
  if (!field) return null;
  
  return (
    <details className="field-hud fixed top-4 left-4 z-50 max-w-sm">
      <summary style={{ borderColor: field.color }}><span style={{ background: field.color }} />{field.name}<Badge variant="secondary">Level {field.level}</Badge></summary>
      <Card className="bg-black/80 border-2 text-white backdrop-blur-sm" style={{ borderColor: field.color }}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: field.color, boxShadow: `0 0 10px ${field.color}` }}
            />
            <h2 className="text-lg font-bold">{field.name} Field</h2>
            <Badge variant="secondary">Level {field.level}</Badge>
          </div>
          
          <p className="text-sm text-gray-300 mb-3">{field.description}</p>
          
          {/* Field Experience */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Field XP</span>
              <span>{field.experience}/100</span>
            </div>
            <Progress value={(field.experience % 100)} className="h-2" />
          </div>
          
          {/* Switch Cooldown */}
          {timeUntilSwitch > 0 && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>Field Switch Cooldown</span>
                <span>{Math.ceil(timeUntilSwitch / 1000)}s</span>
              </div>
              <Progress value={cooldownProgress} className="h-2" />
            </div>
          )}
          
          {/* Active Traits Count */}
          <div className="flex justify-between text-xs text-gray-400">
            <span>Active Traits</span>
            <span>{field.traits.length}</span>
          </div>
        </CardContent>
      </Card>
    </details>
  );
}
