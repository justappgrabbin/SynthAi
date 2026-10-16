import type { FC } from 'react';
import FileManager from './FileManager';
import TextEditor from './TextEditor';
import CodeEditor from './CodeEditor';
import Chat from './Chat';
import Ingest from './Ingest';
interface AppRouterProps { appId: string; windowId: string; }
const AppRouter: FC<AppRouterProps> = ({ appId }) => {
  switch (appId) {
    case 'filemanager': return <FileManager />;
    case 'texteditor': return <TextEditor />;
    case 'codeeditor': return <CodeEditor />;
    case 'chat': return <Chat />;
    case 'ingest': return <Ingest />;
    default: return <div className="p-4">This application is not installed.</div>;
  }
};
export default AppRouter;
