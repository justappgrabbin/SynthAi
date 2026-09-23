import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Database, 
  Shield, 
  Bell,
  Trash2,
  Save,
  Key
} from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [retentionDays, setRetentionDays] = useState("30");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated.",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div>
        <h1 className="text-headline font-semibold">Settings</h1>
        <p className="text-body text-muted-foreground mt-1">
          Configure your Foundry instance
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <SettingsIcon className="h-4 w-4" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how Foundry looks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-caption text-muted-foreground">
                  Choose light or dark mode
                </p>
              </div>
              <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
                <SelectTrigger className="w-[140px]" data-testid="select-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Storage & Retention
            </CardTitle>
            <CardDescription>
              Configure data retention policies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Audit Log Retention</Label>
                <p className="text-caption text-muted-foreground">
                  How long to keep audit logs
                </p>
              </div>
              <Select value={retentionDays} onValueChange={setRetentionDays}>
                <SelectTrigger className="w-[120px]" data-testid="select-retention">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Build Cache</Label>
                <p className="text-caption text-muted-foreground">
                  Current cache size: 128 MB
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure webhook notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Notifications</Label>
                <p className="text-caption text-muted-foreground">
                  Send events to webhook URL
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
                data-testid="switch-notifications"
              />
            </div>

            {notificationsEnabled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://hooks.slack.com/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    data-testid="input-webhook-url"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Events</Label>
                  <div className="space-y-2">
                    {["Promotion to tested", "Promotion to production", "Build failures", "GC completion"].map((event) => (
                      <div key={event} className="flex items-center gap-2">
                        <Switch defaultChecked id={event.toLowerCase().replace(/\s/g, "-")} />
                        <Label htmlFor={event.toLowerCase().replace(/\s/g, "-")} className="text-sm font-normal">
                          {event}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Security
            </CardTitle>
            <CardDescription>
              Signing keys and access control
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Signing Key</Label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value="••••••••••••••••"
                  readOnly
                  className="font-mono"
                  data-testid="input-signing-key"
                />
                <Button variant="outline" size="icon">
                  <Key className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-caption text-muted-foreground">
                Ed25519 key used for signing promotions
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>API Access</Label>
              <div className="flex items-center justify-between">
                <p className="text-sm">Read-only access for CI</p>
                <Button variant="outline" size="sm">
                  Generate Token
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
