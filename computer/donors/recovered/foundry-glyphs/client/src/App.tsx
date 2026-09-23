import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Registry from "@/pages/registry";
import Fragments from "@/pages/fragments";
import Apps from "@/pages/apps";
import Lineage from "@/pages/lineage";
import Audit from "@/pages/audit";
import Settings from "@/pages/settings";
import Resonance from "@/pages/resonance";
import Studio from "@/pages/studio";
import Overseer from "@/pages/overseer";
import System from "@/pages/system";
import Agents from "@/pages/agents";
import Evolution from "@/pages/evolution";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/registry" component={Registry} />
      <Route path="/registry/:id" component={Registry} />
      <Route path="/fragments" component={Fragments} />
      <Route path="/apps" component={Apps} />
      <Route path="/lineage" component={Lineage} />
      <Route path="/resonance" component={Resonance} />
      <Route path="/studio" component={Studio} />
      <Route path="/overseer" component={Overseer} />
      <Route path="/agents" component={Agents} />
      <Route path="/system" component={System} />
      <Route path="/evolution" component={Evolution} />
      <Route path="/audit" component={Audit} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="foundry-theme">
        <TooltipProvider>
          <SidebarProvider style={sidebarStyle as React.CSSProperties}>
            <div className="flex h-screen w-full">
              <AppSidebar />
              <div className="flex flex-col flex-1 min-w-0">
                <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
                  <div className="flex items-center gap-2">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                  </div>
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto">
                  <Router />
                </main>
              </div>
            </div>
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
