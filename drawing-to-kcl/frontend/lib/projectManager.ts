/**
 * Project Manager - 프로젝트 저장/로드 관리
 * 로컬 파일 및 LocalStorage를 통한 자동 저장
 */

import { RecentFilesManager } from './settingsManager';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ProjectMetadata {
  name: string;
  description?: string;
  author?: string;
  version: string;
  created: number;      // timestamp
  modified: number;     // timestamp
  unit: string;
  tags?: string[];
}

export interface Project {
  metadata: ProjectMetadata;
  kclCode: string;
  viewState?: ViewState;
}

export interface ViewState {
  cameraPosition?: [number, number, number];
  cameraTarget?: [number, number, number];
  zoom?: number;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const AUTO_SAVE_KEY = 'forge3d-autosave';
const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5분
const PROJECT_FILE_EXTENSION = '.forge';
const KCL_FILE_EXTENSION = '.kcl';

// ═══════════════════════════════════════════════════════════════
// PROJECT MANAGER CLASS
// ═══════════════════════════════════════════════════════════════

export class ProjectManager {
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private currentProject: Project | null = null;
  private isDirty: boolean = false;
  private onAutoSaveCallback?: (project: Project) => void;

  constructor() {
    this.loadAutoSave();
  }

  /**
   * 새 프로젝트 생성
   */
  createNewProject(name: string = 'Untitled'): Project {
    const now = Date.now();
    this.currentProject = {
      metadata: {
        name,
        version: '1.0.0',
        created: now,
        modified: now,
        unit: 'mm',
      },
      kclCode: `// ${name}\n// Created with Forge 3D CAD\n\n`,
    };
    this.isDirty = true;
    return this.currentProject;
  }

  /**
   * 현재 프로젝트 가져오기
   */
  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  /**
   * KCL 코드 업데이트
   */
  updateKclCode(code: string): void {
    if (this.currentProject) {
      this.currentProject.kclCode = code;
      this.currentProject.metadata.modified = Date.now();
      this.isDirty = true;
    }
  }

  /**
   * 메타데이터 업데이트
   */
  updateMetadata(updates: Partial<ProjectMetadata>): void {
    if (this.currentProject) {
      this.currentProject.metadata = {
        ...this.currentProject.metadata,
        ...updates,
        modified: Date.now(),
      };
      this.isDirty = true;
    }
  }

  /**
   * 뷰 상태 업데이트
   */
  updateViewState(viewState: ViewState): void {
    if (this.currentProject) {
      this.currentProject.viewState = viewState;
    }
  }

  /**
   * 변경 여부 확인
   */
  hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  /**
   * 변경 플래그 초기화
   */
  markAsSaved(): void {
    this.isDirty = false;
  }

  // ═══════════════════════════════════════════════════════════════
  // FILE I/O
  // ═══════════════════════════════════════════════════════════════

  /**
   * 프로젝트를 JSON 파일로 저장 (.forge)
   */
  async saveProjectToFile(): Promise<void> {
    if (!this.currentProject) {
      throw new Error('No project to save');
    }

    const json = JSON.stringify(this.currentProject, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const filename = `${this.currentProject.metadata.name}${PROJECT_FILE_EXTENSION}`;

    await this.downloadFile(blob, filename);
    this.isDirty = false;

    // 최근 파일에 추가
    RecentFilesManager.addRecentFile({
      name: this.currentProject.metadata.name,
      preview: this.currentProject.kclCode.substring(0, 100),
    });
  }

  /**
   * KCL 코드만 파일로 저장 (.kcl)
   */
  async saveKclToFile(): Promise<void> {
    if (!this.currentProject) {
      throw new Error('No project to save');
    }

    const blob = new Blob([this.currentProject.kclCode], { type: 'text/plain' });
    const filename = `${this.currentProject.metadata.name}${KCL_FILE_EXTENSION}`;

    await this.downloadFile(blob, filename);
  }

  /**
   * 파일 다운로드 헬퍼
   */
  private async downloadFile(blob: Blob, filename: string): Promise<void> {
    // File System Access API 지원 확인
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: filename.endsWith('.forge') ? 'Forge Project' : 'KCL File',
              accept: {
                [filename.endsWith('.forge') ? 'application/json' : 'text/plain']: 
                  [filename.endsWith('.forge') ? '.forge' : '.kcl'],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e) {
        // 사용자가 취소한 경우
        if ((e as Error).name === 'AbortError') return;
        // 다른 에러는 폴백으로
      }
    }

    // 폴백: 기존 다운로드 방식
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 프로젝트 파일 로드 (.forge)
   */
  async loadProjectFromFile(): Promise<Project> {
    const file = await this.selectFile(['.forge', '.json']);
    const text = await file.text();
    
    try {
      const project = JSON.parse(text) as Project;
      
      // 유효성 검사
      if (!project.metadata || !project.kclCode) {
        throw new Error('Invalid project file format');
      }

      this.currentProject = project;
      this.isDirty = false;

      // 최근 파일에 추가
      RecentFilesManager.addRecentFile({
        name: project.metadata.name,
        preview: project.kclCode.substring(0, 100),
      });

      return project;
    } catch (error) {
      throw new Error(`Failed to parse project file: ${(error as Error).message}`);
    }
  }

  /**
   * KCL 파일 로드 (.kcl)
   */
  async loadKclFromFile(): Promise<Project> {
    const file = await this.selectFile(['.kcl', '.txt']);
    const text = await file.text();
    const name = file.name.replace(/\.(kcl|txt)$/i, '');

    const now = Date.now();
    this.currentProject = {
      metadata: {
        name,
        version: '1.0.0',
        created: now,
        modified: now,
        unit: 'mm',
      },
      kclCode: text,
    };
    this.isDirty = false;

    // 최근 파일에 추가
    RecentFilesManager.addRecentFile({
      name,
      preview: text.substring(0, 100),
    });

    return this.currentProject;
  }

  /**
   * 파일 선택 헬퍼
   */
  private selectFile(accept: string[]): Promise<File> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept.join(',');
      
      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          resolve(file);
        } else {
          reject(new Error('No file selected'));
        }
      };

      input.click();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTO SAVE
  // ═══════════════════════════════════════════════════════════════

  /**
   * 자동 저장 시작
   */
  startAutoSave(callback?: (project: Project) => void): void {
    this.onAutoSaveCallback = callback;
    this.stopAutoSave();
    
    this.autoSaveTimer = setInterval(() => {
      this.performAutoSave();
    }, AUTO_SAVE_INTERVAL);

    console.log('Auto-save started (5 min interval)');
  }

  /**
   * 자동 저장 중지
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * 자동 저장 실행
   */
  private performAutoSave(): void {
    if (!this.currentProject || !this.isDirty) return;

    if (typeof window === 'undefined') return;

    try {
      const saveData = {
        project: this.currentProject,
        timestamp: Date.now(),
      };
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(saveData));
      console.log('Auto-saved at', new Date().toLocaleTimeString());
      
      if (this.onAutoSaveCallback) {
        this.onAutoSaveCallback(this.currentProject);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  /**
   * 자동 저장 데이터 로드
   */
  loadAutoSave(): Project | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(AUTO_SAVE_KEY);
      if (stored) {
        const { project, timestamp } = JSON.parse(stored);
        console.log('Found auto-save from', new Date(timestamp).toLocaleString());
        return project;
      }
    } catch (error) {
      console.warn('Failed to load auto-save:', error);
    }

    return null;
  }

  /**
   * 자동 저장에서 복원
   */
  restoreFromAutoSave(): Project | null {
    const project = this.loadAutoSave();
    if (project) {
      this.currentProject = project;
      this.isDirty = true; // 복원 후 저장하도록
      return project;
    }
    return null;
  }

  /**
   * 자동 저장 데이터 존재 여부
   */
  hasAutoSave(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTO_SAVE_KEY) !== null;
  }

  /**
   * 자동 저장 데이터 삭제
   */
  clearAutoSave(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(AUTO_SAVE_KEY);
  }

  /**
   * 즉시 자동 저장 (수동 트리거)
   */
  saveNow(): void {
    this.performAutoSave();
  }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

let projectManagerInstance: ProjectManager | null = null;

export function getProjectManager(): ProjectManager {
  if (!projectManagerInstance) {
    projectManagerInstance = new ProjectManager();
  }
  return projectManagerInstance;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * 프로젝트를 공유 가능한 URL로 인코딩
 */
export function encodeProjectToUrl(project: Project): string {
  const json = JSON.stringify({
    n: project.metadata.name,
    c: project.kclCode,
  });
  const encoded = btoa(encodeURIComponent(json));
  return `${window.location.origin}?p=${encoded}`;
}

/**
 * URL에서 프로젝트 디코딩
 */
export function decodeProjectFromUrl(url: string): { name: string; code: string } | null {
  try {
    const urlObj = new URL(url);
    const encoded = urlObj.searchParams.get('p');
    if (!encoded) return null;

    const json = decodeURIComponent(atob(encoded));
    const { n, c } = JSON.parse(json);
    return { name: n, code: c };
  } catch {
    return null;
  }
}
