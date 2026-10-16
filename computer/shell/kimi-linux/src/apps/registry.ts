import type { AppDefinition } from '@/types';

export const APP_REGISTRY: AppDefinition[] = [
  { id: 'filemanager', name: 'File Manager', icon: 'Folder', category: 'System', description: 'Browse and manage files', defaultSize: { width: 800, height: 550 }, minSize: { width: 320, height: 240 } },
  { id: 'ingest', name: 'Import', icon: 'FileUp', category: 'System', description: 'Import and address files or ZIP archives', defaultSize: { width: 850, height: 580 }, minSize: { width: 380, height: 300 } },
  { id: 'texteditor', name: 'Text Editor', icon: 'FileText', category: 'System', description: 'Edit local text files', defaultSize: { width: 640, height: 480 }, minSize: { width: 320, height: 240 } },
  { id: 'codeeditor', name: 'Code Editor', icon: 'Code2', category: 'System', description: 'Edit and run through Synthia execution', defaultSize: { width: 800, height: 560 }, minSize: { width: 320, height: 240 } },
  { id: 'chat', name: 'Synthia', icon: 'MessageSquare', category: 'Internet', description: 'Conversation through AutoLing, DISEMINER and the mesh', defaultSize: { width: 620, height: 600 }, minSize: { width: 320, height: 240 } },
];
export const getAppById = (id: string): AppDefinition | undefined => APP_REGISTRY.find((a) => a.id === id);
export const getAppsByCategory = (category: string): AppDefinition[] => APP_REGISTRY.filter((a) => a.category === category);
export const getDefaultDockApps = (): string[] => ['filemanager','ingest','chat','codeeditor','texteditor'];
