/**
 * Settings Manager - 사용자 설정 관리
 * LocalStorage를 통한 영구 저장
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type Theme = 'light' | 'dark';
export type Unit = 'mm' | 'cm' | 'm' | 'inch';

export interface CameraSettings {
  rotateSpeed: number;    // 0.1 ~ 5.0
  zoomSpeed: number;      // 0.1 ~ 5.0
  panSpeed: number;       // 0.1 ~ 5.0
  enableDamping: boolean;
  dampingFactor: number;  // 0.01 ~ 0.5
}

export interface ViewSettings {
  showGrid: boolean;
  showAxes: boolean;
  showWireframe: boolean;
  gridSize: number;
  gridDivisions: number;
}

export interface EditorSettings {
  fontSize: number;       // 10 ~ 24
  tabSize: number;        // 2 | 4
  wordWrap: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // minutes
}

export interface UserSettings {
  theme: Theme;
  unit: Unit;
  camera: CameraSettings;
  view: ViewSettings;
  editor: EditorSettings;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  rotateSpeed: 1.0,
  zoomSpeed: 1.0,
  panSpeed: 1.0,
  enableDamping: true,
  dampingFactor: 0.1,
};

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  showGrid: true,
  showAxes: true,
  showWireframe: false,
  gridSize: 100,
  gridDivisions: 20,
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  autoSave: true,
  autoSaveInterval: 5, // 5분
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  unit: 'mm',
  camera: DEFAULT_CAMERA_SETTINGS,
  view: DEFAULT_VIEW_SETTINGS,
  editor: DEFAULT_EDITOR_SETTINGS,
};

// ═══════════════════════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'forge3d-settings';
const RECENT_FILES_KEY = 'forge3d-recent-files';
const MAX_RECENT_FILES = 10;

// ═══════════════════════════════════════════════════════════════
// SETTINGS MANAGER CLASS
// ═══════════════════════════════════════════════════════════════

export class SettingsManager {
  private settings: UserSettings;
  private listeners: Set<(settings: UserSettings) => void> = new Set();

  constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * LocalStorage에서 설정 로드
   */
  private loadSettings(): UserSettings {
    if (typeof window === 'undefined') {
      return DEFAULT_SETTINGS;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // 기본값과 병합 (새로운 설정 항목 대응)
        return this.mergeWithDefaults(parsed);
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }

    return DEFAULT_SETTINGS;
  }

  /**
   * 저장된 설정과 기본값 병합
   */
  private mergeWithDefaults(stored: Partial<UserSettings>): UserSettings {
    return {
      theme: stored.theme ?? DEFAULT_SETTINGS.theme,
      unit: stored.unit ?? DEFAULT_SETTINGS.unit,
      camera: {
        ...DEFAULT_CAMERA_SETTINGS,
        ...stored.camera,
      },
      view: {
        ...DEFAULT_VIEW_SETTINGS,
        ...stored.view,
      },
      editor: {
        ...DEFAULT_EDITOR_SETTINGS,
        ...stored.editor,
      },
    };
  }

  /**
   * 설정을 LocalStorage에 저장
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  /**
   * 현재 설정 반환
   */
  getSettings(): UserSettings {
    return { ...this.settings };
  }

  /**
   * 설정 업데이트
   */
  updateSettings(updates: Partial<UserSettings>): void {
    this.settings = {
      ...this.settings,
      ...updates,
      camera: {
        ...this.settings.camera,
        ...updates.camera,
      },
      view: {
        ...this.settings.view,
        ...updates.view,
      },
      editor: {
        ...this.settings.editor,
        ...updates.editor,
      },
    };
    this.saveSettings();
    this.notifyListeners();
  }

  /**
   * 특정 카테고리 설정 업데이트
   */
  updateCameraSettings(updates: Partial<CameraSettings>): void {
    this.settings.camera = { ...this.settings.camera, ...updates };
    this.saveSettings();
    this.notifyListeners();
  }

  updateViewSettings(updates: Partial<ViewSettings>): void {
    this.settings.view = { ...this.settings.view, ...updates };
    this.saveSettings();
    this.notifyListeners();
  }

  updateEditorSettings(updates: Partial<EditorSettings>): void {
    this.settings.editor = { ...this.settings.editor, ...updates };
    this.saveSettings();
    this.notifyListeners();
  }

  /**
   * 설정 초기화
   */
  resetSettings(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    this.notifyListeners();
  }

  /**
   * 리스너 등록
   */
  subscribe(listener: (settings: UserSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 리스너들에게 변경 알림
   */
  private notifyListeners(): void {
    const settings = this.getSettings();
    this.listeners.forEach(listener => listener(settings));
  }

  /**
   * 테마 적용
   */
  applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// RECENT FILES MANAGER
// ═══════════════════════════════════════════════════════════════

export interface RecentFile {
  name: string;
  path?: string;
  lastOpened: number; // timestamp
  preview?: string;   // KCL 코드 미리보기 (처음 100자)
}

export class RecentFilesManager {
  /**
   * 최근 파일 목록 가져오기
   */
  static getRecentFiles(): RecentFile[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(RECENT_FILES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load recent files:', error);
    }

    return [];
  }

  /**
   * 최근 파일에 추가
   */
  static addRecentFile(file: Omit<RecentFile, 'lastOpened'>): void {
    if (typeof window === 'undefined') return;

    try {
      const files = this.getRecentFiles();
      
      // 같은 이름의 파일이 있으면 제거
      const filtered = files.filter(f => f.name !== file.name);
      
      // 새 파일을 맨 앞에 추가
      const newFile: RecentFile = {
        ...file,
        lastOpened: Date.now(),
      };
      filtered.unshift(newFile);

      // 최대 개수 유지
      const trimmed = filtered.slice(0, MAX_RECENT_FILES);

      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to add recent file:', error);
    }
  }

  /**
   * 최근 파일 제거
   */
  static removeRecentFile(name: string): void {
    if (typeof window === 'undefined') return;

    try {
      const files = this.getRecentFiles();
      const filtered = files.filter(f => f.name !== name);
      localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to remove recent file:', error);
    }
  }

  /**
   * 최근 파일 목록 초기화
   */
  static clearRecentFiles(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(RECENT_FILES_KEY);
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

let settingsManagerInstance: SettingsManager | null = null;

export function getSettingsManager(): SettingsManager {
  if (!settingsManagerInstance) {
    settingsManagerInstance = new SettingsManager();
  }
  return settingsManagerInstance;
}

// ═══════════════════════════════════════════════════════════════
// UNIT CONVERSION UTILITIES
// ═══════════════════════════════════════════════════════════════

export const UNIT_CONVERSIONS: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  inch: 25.4,
};

export function convertUnit(value: number, from: Unit, to: Unit): number {
  const mmValue = value * UNIT_CONVERSIONS[from];
  return mmValue / UNIT_CONVERSIONS[to];
}

export function formatWithUnit(value: number, unit: Unit, precision: number = 2): string {
  return `${value.toFixed(precision)} ${unit}`;
}
