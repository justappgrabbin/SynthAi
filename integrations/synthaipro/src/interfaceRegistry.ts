export type InterfaceMode = {
  id: string;
  name: string;
  description: string;
  kind: "native" | "iframe";
  path?: string;
};

export const INTERFACE_STORAGE_KEY = "synthaipro.interface";

export const interfaceModes: InterfaceMode[] = [
  {
    id: "command",
    name: "Command Center",
    description: "Mobile-friendly SynthAIPro dashboard with Synthia connection status.",
    kind: "native",
  },
  {
    id: "morph-system",
    name: "Morph System",
    description: "Standalone morph engine interface.",
    kind: "iframe",
    path: "/interfaces/morph-system.html",
  },
  {
    id: "stellar-nexus",
    name: "Stellar Nexus",
    description: "Standalone Stellar Nexus v5 interface.",
    kind: "iframe",
    path: "/interfaces/stellar-nexus-v5.html",
  },
];

export function findInterfaceMode(id: string | null) {
  return interfaceModes.find((mode) => mode.id === id) ?? interfaceModes[0];
}
