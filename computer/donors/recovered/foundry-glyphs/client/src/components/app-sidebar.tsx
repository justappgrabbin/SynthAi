import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  Database, 
  Box, 
  Layers, 
  GitBranch, 
  ScrollText,
  Settings,
  Hexagon,
  Zap,
  Hammer,
  Shield,
  Cog,
  Bot,
  Dna,
} from "lucide-react";

const mainNavItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Registry", url: "/registry", icon: Database },
  { title: "Fragments", url: "/fragments", icon: Box },
  { title: "Apps", url: "/apps", icon: Layers },
  { title: "Lineage", url: "/lineage", icon: GitBranch },
  { title: "Resonance", url: "/resonance", icon: Zap },
  { title: "Studio", url: "/studio", icon: Hammer },
  { title: "Overseer", url: "/overseer", icon: Shield },
  { title: "Agents", url: "/agents", icon: Bot },
  { title: "System", url: "/system", icon: Cog },
  { title: "Evolution", url: "/evolution", icon: Dna },
  { title: "Audit", url: "/audit", icon: ScrollText },
];

const settingsItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Hexagon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-base tracking-tight">Foundry</h1>
            <p className="text-[10px] text-muted-foreground leading-none">Glyph Registry</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = location === item.url || 
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3 border-t">
        <div className="flex items-center gap-2 text-caption text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-chart-2" />
          <span>System Healthy</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          foundry@1.0.0 · Node 24
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
