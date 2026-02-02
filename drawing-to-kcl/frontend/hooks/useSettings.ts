/**
 * useSettings Hook - React에서 설정 관리
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getSettingsManager,
  SettingsManager,
  UserSettings,
  CameraSettings,
  ViewSettings,
  EditorSettings,
  Theme,
  Unit,
  RecentFilesManager,
  RecentFile,
  DEFAULT_SETTINGS,
} from '@/lib/settingsManager';
import {
  getProjectManager,
  ProjectManager,
  Project,
  ProjectMetadata,
} from '@/lib/projectManager';

// ═══════════════════════════════════════════════════════════════
// useSettings Hook
// ═══════════════════════════════════════════════════════════════

export interface UseSettingsReturn {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  updateCameraSettings: (updates: Partial<CameraSettings>) => void;
  updateViewSettings: (updates: Partial<ViewSettings>) => void;
  updateEditorSettings: (updates: Partial<EditorSettings>) => void;
  setTheme: (theme: Theme) => void;
  setUnit: (unit: Unit) => void;
  resetSettings: () => void;
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [manager] = useState<SettingsManager>(() => getSettingsManager());

  useEffect(() => {
    // 초기 설정 로드
    setSettings(manager.getSettings());

    // 설정 변경 구독
    const unsubscribe = manager.subscribe((newSettings) => {
      setSettings(newSettings);
    });

    // 테마 적용
    manager.applyTheme(manager.getSettings().theme);

    return unsubscribe;
  }, [manager]);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    manager.updateSettings(updates);
  }, [manager]);

  const updateCameraSettings = useCallback((updates: Partial<CameraSettings>) => {
    manager.updateCameraSettings(updates);
  }, [manager]);

  const updateViewSettings = useCallback((updates: Partial<ViewSettings>) => {
    manager.updateViewSettings(updates);
  }, [manager]);

  const updateEditorSettings = useCallback((updates: Partial<EditorSettings>) => {
    manager.updateEditorSettings(updates);
  }, [manager]);

  const setTheme = useCallback((theme: Theme) => {
    manager.updateSettings({ theme });
    manager.applyTheme(theme);
  }, [manager]);

  const setUnit = useCallback((unit: Unit) => {
    manager.updateSettings({ unit });
  }, [manager]);

  const resetSettings = useCallback(() => {
    manager.resetSettings();
    manager.applyTheme(DEFAULT_SETTINGS.theme);
  }, [manager]);

  return {
    settings,
    updateSettings,
    updateCameraSettings,
    updateViewSettings,
    updateEditorSettings,
    setTheme,
    setUnit,
    resetSettings,
  };
}

// ═══════════════════════════════════════════════════════════════
// useProject Hook
// ═══════════════════════════════════════════════════════════════

export interface UseProjectReturn {
  project: Project | null;
  isDirty: boolean;
  createNewProject: (name?: string) => Project;
  updateKclCode: (code: string) => void;
  updateMetadata: (updates: Partial<ProjectMetadata>) => void;
  saveProjectToFile: () => Promise<void>;
  saveKclToFile: () => Promise<void>;
  loadProjectFromFile: () => Promise<Project>;
  loadKclFromFile: () => Promise<Project>;
  hasAutoSave: boolean;
  restoreFromAutoSave: () => Project | null;
  clearAutoSave: () => void;
  saveNow: () => void;
}

export function useProject(): UseProjectReturn {
  const [project, setProject] = useState<Project | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [hasAutoSave, setHasAutoSave] = useState(false);
  const [manager] = useState<ProjectManager>(() => getProjectManager());

  useEffect(() => {
    // 자동 저장 존재 여부 확인
    setHasAutoSave(manager.hasAutoSave());

    // 자동 저장 시작
    manager.startAutoSave((savedProject) => {
      console.log('Project auto-saved:', savedProject.metadata.name);
    });

    // 현재 프로젝트 로드
    const current = manager.getCurrentProject();
    if (current) {
      setProject(current);
    }

    return () => {
      manager.stopAutoSave();
    };
  }, [manager]);

  const createNewProject = useCallback((name?: string) => {
    const newProject = manager.createNewProject(name);
    setProject(newProject);
    setIsDirty(true);
    return newProject;
  }, [manager]);

  const updateKclCode = useCallback((code: string) => {
    manager.updateKclCode(code);
    setProject(manager.getCurrentProject());
    setIsDirty(manager.hasUnsavedChanges());
  }, [manager]);

  const updateMetadata = useCallback((updates: Partial<ProjectMetadata>) => {
    manager.updateMetadata(updates);
    setProject(manager.getCurrentProject());
    setIsDirty(manager.hasUnsavedChanges());
  }, [manager]);

  const saveProjectToFile = useCallback(async () => {
    await manager.saveProjectToFile();
    setIsDirty(false);
  }, [manager]);

  const saveKclToFile = useCallback(async () => {
    await manager.saveKclToFile();
  }, [manager]);

  const loadProjectFromFile = useCallback(async () => {
    const loaded = await manager.loadProjectFromFile();
    setProject(loaded);
    setIsDirty(false);
    return loaded;
  }, [manager]);

  const loadKclFromFile = useCallback(async () => {
    const loaded = await manager.loadKclFromFile();
    setProject(loaded);
    setIsDirty(false);
    return loaded;
  }, [manager]);

  const restoreFromAutoSave = useCallback(() => {
    const restored = manager.restoreFromAutoSave();
    if (restored) {
      setProject(restored);
      setIsDirty(true);
      setHasAutoSave(false);
    }
    return restored;
  }, [manager]);

  const clearAutoSave = useCallback(() => {
    manager.clearAutoSave();
    setHasAutoSave(false);
  }, [manager]);

  const saveNow = useCallback(() => {
    manager.saveNow();
  }, [manager]);

  return {
    project,
    isDirty,
    createNewProject,
    updateKclCode,
    updateMetadata,
    saveProjectToFile,
    saveKclToFile,
    loadProjectFromFile,
    loadKclFromFile,
    hasAutoSave,
    restoreFromAutoSave,
    clearAutoSave,
    saveNow,
  };
}

// ═══════════════════════════════════════════════════════════════
// useRecentFiles Hook
// ═══════════════════════════════════════════════════════════════

export interface UseRecentFilesReturn {
  recentFiles: RecentFile[];
  addRecentFile: (file: Omit<RecentFile, 'lastOpened'>) => void;
  removeRecentFile: (name: string) => void;
  clearRecentFiles: () => void;
  refreshRecentFiles: () => void;
}

export function useRecentFiles(): UseRecentFilesReturn {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  const refreshRecentFiles = useCallback(() => {
    setRecentFiles(RecentFilesManager.getRecentFiles());
  }, []);

  useEffect(() => {
    refreshRecentFiles();
  }, [refreshRecentFiles]);

  const addRecentFile = useCallback((file: Omit<RecentFile, 'lastOpened'>) => {
    RecentFilesManager.addRecentFile(file);
    refreshRecentFiles();
  }, [refreshRecentFiles]);

  const removeRecentFile = useCallback((name: string) => {
    RecentFilesManager.removeRecentFile(name);
    refreshRecentFiles();
  }, [refreshRecentFiles]);

  const clearRecentFiles = useCallback(() => {
    RecentFilesManager.clearRecentFiles();
    refreshRecentFiles();
  }, [refreshRecentFiles]);

  return {
    recentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
    refreshRecentFiles,
  };
}

// ═══════════════════════════════════════════════════════════════
// Combined Hook for convenience
// ═══════════════════════════════════════════════════════════════

export interface UseForgeReturn extends UseSettingsReturn, UseProjectReturn, UseRecentFilesReturn {}

export function useForge(): UseForgeReturn {
  const settings = useSettings();
  const project = useProject();
  const recentFiles = useRecentFiles();

  return {
    ...settings,
    ...project,
    ...recentFiles,
  };
}
