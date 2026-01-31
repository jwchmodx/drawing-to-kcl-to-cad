import { PanelResizer } from './components/PanelResizer';
import {
  Header,
  Sidebar,
  ProjectExplorer,
  Viewport,
  AIAssistant,
} from './components/layout';
import { usePanelResize } from './hooks/usePanelResize';
import {
  SAMPLE_PREVIEW,
  MIN_LEFT_PANEL,
  MAX_LEFT_PANEL,
  MIN_RIGHT_PANEL,
  MAX_RIGHT_PANEL,
  DEFAULT_LEFT_PANEL,
  DEFAULT_RIGHT_PANEL,
} from './constants';

function App() {
  const [leftPanelWidth, onLeftResize] = usePanelResize(
    DEFAULT_LEFT_PANEL,
    MIN_LEFT_PANEL,
    MAX_LEFT_PANEL,
    1
  );
  const [rightPanelWidth, onRightResize] = usePanelResize(
    DEFAULT_RIGHT_PANEL,
    MIN_RIGHT_PANEL,
    MAX_RIGHT_PANEL,
    -1
  );

  return (
    <div className="bg-background-light dark:bg-background-dark text-white overflow-hidden h-screen flex flex-col">
      <Header />

      <div className="flex flex-1 overflow-hidden min-w-0">
        {/* Left: Sidebar + Project Explorer + Resizer */}
        <div className="flex shrink-0">
          <Sidebar />
          <ProjectExplorer width={leftPanelWidth} />
          <PanelResizer
            className="hidden lg:block"
            onResize={onLeftResize}
          />
        </div>

        {/* Middle: Viewport */}
        <Viewport preview={SAMPLE_PREVIEW} />

        {/* Right: Resizer + AI Assistant */}
        <div className="flex shrink-0">
          <PanelResizer onResize={onRightResize} />
          <AIAssistant width={rightPanelWidth} />
        </div>
      </div>
    </div>
  );
}

export default App;
