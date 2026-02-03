'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import Editor, { Monaco, OnMount, OnChange } from '@monaco-editor/react';
import type { editor, MarkerSeverity } from 'monaco-editor';
import { validateKCL, type KCLError } from '@/lib/kclErrorHandler';

// ═══════════════════════════════════════════════════════════════
// KCL 언어 정의
// ═══════════════════════════════════════════════════════════════

const KCL_LANGUAGE_ID = 'kcl';

// KCL 키워드 및 함수 목록
const KCL_KEYWORDS = ['let'];

const KCL_PRIMITIVES = [
  'box', 'cylinder', 'sphere', 'cone', 'torus', 'helix',
];

const KCL_OPERATIONS = [
  'extrude', 'fillet', 'chamfer', 'shell', 'revolve', 'sweep', 'loft', 'draft',
  'union', 'subtract', 'intersect',
  'linear_pattern', 'circular_pattern',
  'translate', 'rotate', 'scale', 'mirror',
];

const KCL_PARAMETERS = [
  'size', 'center', 'radius', 'height', 'distance', 'angle', 'axis',
  'offset', 'factor', 'plane', 'direction', 'count', 'spacing',
  'thickness', 'profile', 'path', 'profiles', 'segments',
  'major_radius', 'minor_radius', 'pitch', 'turns', 'tube_radius',
  'open_faces',
];

const KCL_FACES = ['top', 'bottom', 'left', 'right', 'front', 'back'];

// Monaco 언어 설정
function registerKCLLanguage(monaco: Monaco) {
  // 언어 등록
  monaco.languages.register({ id: KCL_LANGUAGE_ID });

  // 토큰 정의 (문법 하이라이팅)
  monaco.languages.setMonarchTokensProvider(KCL_LANGUAGE_ID, {
    keywords: KCL_KEYWORDS,
    primitives: KCL_PRIMITIVES,
    operations: KCL_OPERATIONS,
    parameters: KCL_PARAMETERS,
    faces: KCL_FACES,

    tokenizer: {
      root: [
        // 주석
        [/\/\/.*$/, 'comment'],
        [/#.*$/, 'comment'],

        // 문자열
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],

        // 숫자
        [/-?\d+\.?\d*([eE][+-]?\d+)?/, 'number'],

        // 키워드
        [/\b(let)\b/, 'keyword'],

        // 기본 도형 (cyan)
        [/\b(box|cylinder|sphere|cone|torus|helix)\b/, 'primitive'],

        // 연산 (green)
        [/\b(extrude|fillet|chamfer|shell|revolve|sweep|loft|draft)\b/, 'operation'],
        [/\b(union|subtract|intersect)\b/, 'boolean'],
        [/\b(linear_pattern|circular_pattern)\b/, 'pattern'],
        [/\b(translate|rotate|scale|mirror)\b/, 'transform'],

        // 파라미터 이름
        [/\b(size|center|radius|height|distance|angle|axis|offset|factor|plane|direction|count|spacing|thickness|profile|path|profiles|segments|major_radius|minor_radius|pitch|turns|tube_radius|open_faces)\b(?=\s*:)/, 'parameter'],

        // face 접근
        [/\.(face)\.(top|bottom|left|right|front|back)/, 'face-access'],
        [/\.(edge)\[\d+\]/, 'edge-access'],

        // 변수명
        [/[a-zA-Z_]\w*/, 'identifier'],

        // 구분자
        [/[{}()\[\]]/, 'delimiter.bracket'],
        [/[,:]/, 'delimiter'],
        [/=/, 'operator'],
      ],
    },
  });

  // 테마 정의
  monaco.editor.defineTheme('kcl-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'C586C0', fontStyle: 'bold' },
      { token: 'primitive', foreground: '4EC9B0', fontStyle: 'bold' },
      { token: 'operation', foreground: 'DCDCAA' },
      { token: 'boolean', foreground: 'CE9178' },
      { token: 'pattern', foreground: '9CDCFE' },
      { token: 'transform', foreground: '4FC1FF' },
      { token: 'parameter', foreground: '9CDCFE' },
      { token: 'face-access', foreground: 'D7BA7D' },
      { token: 'edge-access', foreground: 'D7BA7D' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'delimiter.bracket', foreground: 'FFD700' },
      { token: 'operator', foreground: 'D4D4D4' },
    ],
    colors: {
      'editor.background': '#0D0D0D',
      'editor.foreground': '#E0E0E0',
      'editor.lineHighlightBackground': '#1A1A1A',
      'editor.selectionBackground': '#264F78',
      'editorCursor.foreground': '#00D9FF',
      'editorLineNumber.foreground': '#4A4A4A',
      'editorLineNumber.activeForeground': '#00D9FF',
      'editorIndentGuide.background': '#2A2A2A',
      'editorIndentGuide.activeBackground': '#3A3A3A',
      'editorError.foreground': '#FF6B6B',
      'editorWarning.foreground': '#FFD93D',
    },
  });

  // 자동완성 제공
  monaco.languages.registerCompletionItemProvider(KCL_LANGUAGE_ID, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: any[] = [];

      // 기본 도형 스니펫
      KCL_PRIMITIVES.forEach((prim) => {
        if (prim === 'box') {
          suggestions.push({
            label: 'box (simple)',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'let ${1:myBox} = box(${2:50}, ${3:30}, ${4:20})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '간단한 박스 생성 (width, height, depth)',
            range,
          });
          suggestions.push({
            label: 'box (full)',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'let ${1:myBox} = box(size: [${2:50}, ${3:30}, ${4:20}], center: [${5:0}, ${6:15}, ${7:0}])',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '정식 문법 박스 생성',
            range,
          });
        } else if (prim === 'cylinder') {
          suggestions.push({
            label: 'cylinder (simple)',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'let ${1:myCyl} = cylinder(${2:10}, ${3:30})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '간단한 실린더 생성 (radius, height)',
            range,
          });
          suggestions.push({
            label: 'cylinder (full)',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'let ${1:myCyl} = cylinder(radius: ${2:10}, height: ${3:30}, center: [${4:0}, ${5:15}, ${6:0}])',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '정식 문법 실린더 생성',
            range,
          });
        } else if (prim === 'sphere') {
          suggestions.push({
            label: 'sphere (simple)',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'let ${1:mySphere} = sphere(${2:10})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '간단한 구 생성 (radius)',
            range,
          });
          suggestions.push({
            label: 'sphere (full)',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'let ${1:mySphere} = sphere(radius: ${2:10}, center: [${3:0}, ${4:10}, ${5:0}])',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '정식 문법 구 생성',
            range,
          });
        } else if (prim === 'cone') {
          suggestions.push({
            label: 'cone',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'let ${1:myCone} = cone(radius: ${2:10}, height: ${3:20}, center: [${4:0}, ${5:10}, ${6:0}])',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '원뿔 생성',
            range,
          });
        } else if (prim === 'torus') {
          suggestions.push({
            label: 'torus',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'let ${1:myTorus} = torus(major_radius: ${2:20}, minor_radius: ${3:5}, center: [${4:0}, ${5:0}, ${6:0}])',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: '토러스(도넛) 생성',
            range,
          });
        }
      });

      // Boolean 연산 스니펫
      ['union', 'subtract', 'intersect'].forEach((op) => {
        suggestions.push({
          label: op,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `let \${1:result} = ${op}(\${2:a}, \${3:b})`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: `${op === 'union' ? '합집합' : op === 'subtract' ? '차집합' : '교집합'} 연산`,
          range,
        });
      });

      // 변환 연산 스니펫
      suggestions.push({
        label: 'translate',
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: 'let ${1:moved} = translate(${2:source}, offset: [${3:10}, ${4:0}, ${5:0}])',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: '이동 변환',
        range,
      });
      suggestions.push({
        label: 'rotate',
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: 'let ${1:rotated} = rotate(${2:source}, axis: [${3:0}, ${4:1}, ${5:0}], angle: ${6:45})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: '회전 변환',
        range,
      });
      suggestions.push({
        label: 'scale',
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: 'let ${1:scaled} = scale(${2:source}, factor: ${3:2})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: '크기 변환',
        range,
      });

      // Extrude 스니펫
      suggestions.push({
        label: 'extrude',
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: 'let ${1:extruded} = extrude(${2:source}.face.${3|top,bottom,left,right,front,back|}, distance: ${4:10})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: '면 돌출',
        range,
      });

      // Fillet 스니펫
      suggestions.push({
        label: 'fillet',
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: 'let ${1:filleted} = fillet(${2:source}.edge[${3:0}], radius: ${4:2})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: '모서리 둥글게',
        range,
      });

      return { suggestions };
    },
  });

  // 호버 정보 제공
  monaco.languages.registerHoverProvider(KCL_LANGUAGE_ID, {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const hoverInfo: Record<string, string> = {
        'box': '📦 **box** - 직육면체 생성\n\n`box(width, height, depth)` 또는\n`box(size: [w, h, d], center: [x, y, z])`',
        'cylinder': '🔵 **cylinder** - 원통 생성\n\n`cylinder(radius, height)` 또는\n`cylinder(radius: r, height: h, center: [x, y, z])`',
        'sphere': '⚪ **sphere** - 구 생성\n\n`sphere(radius)` 또는\n`sphere(radius: r, center: [x, y, z])`',
        'cone': '🔺 **cone** - 원뿔 생성\n\n`cone(radius: r, height: h, center: [x, y, z])`',
        'torus': '🍩 **torus** - 도넛 생성\n\n`torus(major_radius: R, minor_radius: r, center: [x, y, z])`',
        'union': '➕ **union** - 합집합 (두 도형 합치기)\n\n`union(a, b)`',
        'subtract': '➖ **subtract** - 차집합 (a에서 b 빼기)\n\n`subtract(a, b)`',
        'intersect': '✖️ **intersect** - 교집합 (겹치는 부분만)\n\n`intersect(a, b)`',
        'extrude': '📏 **extrude** - 면 돌출\n\n`extrude(source.face.top, distance: 10)`',
        'fillet': '🔘 **fillet** - 모서리 둥글게\n\n`fillet(source.edge[0], radius: 2)`',
        'chamfer': '📐 **chamfer** - 모서리 깎기\n\n`chamfer(source.edge[0], distance: 2)`',
        'translate': '↔️ **translate** - 이동\n\n`translate(source, offset: [x, y, z])`',
        'rotate': '🔄 **rotate** - 회전\n\n`rotate(source, axis: [0, 1, 0], angle: 45)`',
        'scale': '📏 **scale** - 크기 조절\n\n`scale(source, factor: 2)` 또는\n`scale(source, factor: [x, y, z])`',
        'let': '📝 **let** - 변수 선언\n\n`let myVar = ...`',
      };

      const info = hoverInfo[word.word];
      if (info) {
        return {
          contents: [{ value: info }],
        };
      }
      return null;
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// 에디터 컴포넌트
// ═══════════════════════════════════════════════════════════════

interface KCLCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onValidate?: (errors: KCLError[], warnings: KCLError[]) => void;
  onRun?: (code: string) => void;
  height?: string | number;
  readOnly?: boolean;
}

export function KCLCodeEditor({
  value,
  onChange,
  onValidate,
  onRun,
  height = '100%',
  readOnly = false,
}: KCLCodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 에러 마커 업데이트
  const updateMarkers = useCallback((errors: KCLError[], warnings: KCLError[]) => {
    if (!monacoRef.current || !editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const markers: editor.IMarkerData[] = [];

    // 에러 마커
    errors.forEach((error) => {
      markers.push({
        severity: monacoRef.current!.MarkerSeverity.Error,
        message: error.message + (error.suggestion ? `\n💡 ${error.suggestion}` : ''),
        startLineNumber: error.line || 1,
        startColumn: error.column || 1,
        endLineNumber: error.line || 1,
        endColumn: error.code ? error.code.length + 1 : 100,
      });
    });

    // 경고 마커
    warnings.forEach((warning) => {
      markers.push({
        severity: monacoRef.current!.MarkerSeverity.Warning,
        message: warning.message + (warning.suggestion ? `\n💡 ${warning.suggestion}` : ''),
        startLineNumber: warning.line || 1,
        startColumn: warning.column || 1,
        endLineNumber: warning.line || 1,
        endColumn: warning.code ? warning.code.length + 1 : 100,
      });
    });

    monacoRef.current.editor.setModelMarkers(model, 'kcl', markers);
  }, []);

  // 코드 유효성 검사 (디바운스)
  const validateCode = useCallback((code: string) => {
    const result = validateKCL(code);
    updateMarkers(result.errors, result.warnings);
    onValidate?.(result.errors, result.warnings);
  }, [updateMarkers, onValidate]);

  // 에디터 마운트
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // KCL 언어 등록
    registerKCLLanguage(monaco);

    // 테마 적용
    monaco.editor.setTheme('kcl-dark');

    // 키보드 단축키
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun?.(editor.getValue());
    });

    // 초기 유효성 검사
    setTimeout(() => {
      validateCode(value);
      setIsReady(true);
    }, 100);
  };

  // 코드 변경 처리
  const handleChange: OnChange = (newValue) => {
    const code = newValue || '';
    onChange(code);
    validateCode(code);
  };

  return (
    <div className="relative w-full h-full">
      <Editor
        height={height}
        language={KCL_LANGUAGE_ID}
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        theme="kcl-dark"
        options={{
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          readOnly,
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
          lineDecorationsWidth: 10,
          folding: true,
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-void text-text-muted">
            <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
            에디터 로딩 중...
          </div>
        }
      />
      
      {/* 상태 바 */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-surface/90 border-t border-white/5 flex items-center justify-between px-3 text-[10px] text-text-muted">
        <div className="flex items-center gap-3">
          <span>KCL</span>
          <span>|</span>
          <span>{value.split('\n').length} lines</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1 py-0.5 bg-white/5 rounded text-[9px]">Ctrl+Enter</kbd>
          <span>실행</span>
        </div>
      </div>
    </div>
  );
}

export default KCLCodeEditor;
