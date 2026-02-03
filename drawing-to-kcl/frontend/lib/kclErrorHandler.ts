/**
 * KCL Error Handler
 * 체계적인 에러 처리 및 사용자 친화적 에러 메시지
 */

export type KCLErrorType = 
  | 'SYNTAX_ERROR'      // 문법 오류
  | 'REFERENCE_ERROR'   // 존재하지 않는 변수 참조
  | 'TYPE_ERROR'        // 타입 불일치
  | 'VALUE_ERROR'       // 잘못된 값 (음수 반지름 등)
  | 'PARSE_ERROR'       // 파싱 실패
  | 'RUNTIME_ERROR'     // 런타임 오류
  | 'UNKNOWN_ERROR';    // 알 수 없는 오류

export interface KCLError {
  type: KCLErrorType;
  message: string;
  line?: number;
  column?: number;
  code?: string;       // 문제가 된 코드 조각
  suggestion?: string; // 수정 제안
}

export interface KCLParseResult<T> {
  success: boolean;
  data?: T;
  errors: KCLError[];
  warnings: KCLError[];
}

/**
 * 에러 메시지 생성
 */
export function createError(
  type: KCLErrorType,
  message: string,
  options: Partial<KCLError> = {}
): KCLError {
  return {
    type,
    message,
    ...options,
  };
}

/**
 * 라인 번호 찾기
 */
export function findLineNumber(code: string, position: number): { line: number; column: number } {
  const lines = code.substring(0, position).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * KCL 코드 유효성 검사
 */
export function validateKCLCode(code: string): KCLError[] {
  const errors: KCLError[] = [];
  const lines = code.split('\n');
  
  // 정의된 변수 추적
  const definedVariables = new Set<string>();
  
  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;
    const trimmed = line.trim();
    
    // 빈 줄이나 주석 무시
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      return;
    }
    
    // let 문 검사
    const letMatch = trimmed.match(/^let\s+(\w+)\s*=/);
    if (letMatch) {
      const varName = letMatch[1];
      
      // 중복 변수 검사
      if (definedVariables.has(varName)) {
        errors.push(createError('SYNTAX_ERROR', `변수 '${varName}'가 이미 정의되어 있습니다`, {
          line: lineNum,
          code: line,
          suggestion: `다른 변수명을 사용하세요 (예: ${varName}2)`,
        }));
      }
      definedVariables.add(varName);
      
      // 함수 호출 검사
      const funcMatch = trimmed.match(/=\s*(\w+)\s*\(/);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const validFunctions = [
          'box', 'cylinder', 'sphere', 'cone', 'torus', 'helix',
          'extrude', 'fillet', 'chamfer', 'shell', 'revolve', 'sweep', 'loft', 'draft',
          'union', 'subtract', 'intersect',
          'linear_pattern', 'circular_pattern',
          'translate', 'rotate', 'scale', 'mirror',
        ];
        
        if (!validFunctions.includes(funcName)) {
          errors.push(createError('REFERENCE_ERROR', `알 수 없는 함수: '${funcName}'`, {
            line: lineNum,
            code: line,
            suggestion: `사용 가능한 함수: ${validFunctions.slice(0, 5).join(', ')} 등`,
          }));
        }
      }
    }
    
    // 괄호 짝 검사
    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push(createError('SYNTAX_ERROR', '괄호 짝이 맞지 않습니다', {
        line: lineNum,
        code: line,
        suggestion: openParens > closeParens 
          ? `닫는 괄호 ')' ${openParens - closeParens}개가 필요합니다`
          : `여는 괄호 '(' ${closeParens - openParens}개가 필요합니다`,
      }));
    }
    
    // 대괄호 짝 검사
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push(createError('SYNTAX_ERROR', '대괄호 짝이 맞지 않습니다', {
        line: lineNum,
        code: line,
        suggestion: openBrackets > closeBrackets 
          ? `닫는 대괄호 ']' ${openBrackets - closeBrackets}개가 필요합니다`
          : `여는 대괄호 '[' ${closeBrackets - openBrackets}개가 필요합니다`,
      }));
    }
    
    // 참조 변수 검사
    const refMatches = trimmed.matchAll(/(?:union|subtract|intersect|extrude|fillet|chamfer|translate|rotate|scale|mirror|shell|linear_pattern|circular_pattern)\s*\(\s*(\w+)/g);
    for (const match of refMatches) {
      const refVar = match[1];
      if (!definedVariables.has(refVar) && !['size', 'center', 'radius', 'height', 'distance', 'angle', 'axis', 'offset', 'factor', 'plane', 'direction', 'count', 'spacing', 'thickness', 'profile', 'path', 'profiles'].includes(refVar)) {
        errors.push(createError('REFERENCE_ERROR', `정의되지 않은 변수: '${refVar}'`, {
          line: lineNum,
          code: line,
          suggestion: `먼저 'let ${refVar} = ...'로 변수를 정의하세요`,
        }));
      }
    }
  });
  
  return errors;
}

/**
 * 숫자 값 검증
 */
export function validateNumericValues(code: string): KCLError[] {
  const errors: KCLError[] = [];
  const lines = code.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const lineNum = lineIndex + 1;
    
    // 반지름이 음수인지 검사
    const radiusMatch = line.match(/radius\s*:\s*([-\d.]+)/);
    if (radiusMatch && parseFloat(radiusMatch[1]) <= 0) {
      errors.push(createError('VALUE_ERROR', '반지름은 양수여야 합니다', {
        line: lineNum,
        code: line,
        suggestion: `radius: ${Math.abs(parseFloat(radiusMatch[1]))} 로 변경하세요`,
      }));
    }
    
    // 높이가 음수인지 검사
    const heightMatch = line.match(/height\s*:\s*([-\d.]+)/);
    if (heightMatch && parseFloat(heightMatch[1]) <= 0) {
      errors.push(createError('VALUE_ERROR', '높이는 양수여야 합니다', {
        line: lineNum,
        code: line,
        suggestion: `height: ${Math.abs(parseFloat(heightMatch[1]))} 로 변경하세요`,
      }));
    }
    
    // size 배열에 음수가 있는지 검사
    const sizeMatch = line.match(/size\s*:\s*\[\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\]/);
    if (sizeMatch) {
      const [, w, h, d] = sizeMatch;
      if (parseFloat(w) <= 0 || parseFloat(h) <= 0 || parseFloat(d) <= 0) {
        errors.push(createError('VALUE_ERROR', 'size 값은 모두 양수여야 합니다', {
          line: lineNum,
          code: line,
          suggestion: `size: [${Math.abs(parseFloat(w))}, ${Math.abs(parseFloat(h))}, ${Math.abs(parseFloat(d))}] 로 변경하세요`,
        }));
      }
    }
  });
  
  return errors;
}

/**
 * 에러 메시지 포맷팅
 */
export function formatError(error: KCLError): string {
  let msg = `[${error.type}]`;
  
  if (error.line !== undefined) {
    msg += ` Line ${error.line}:`;
  }
  
  msg += ` ${error.message}`;
  
  if (error.code) {
    msg += `\n  → ${error.code.trim()}`;
  }
  
  if (error.suggestion) {
    msg += `\n  💡 ${error.suggestion}`;
  }
  
  return msg;
}

/**
 * 에러를 HTML로 포맷팅 (UI용)
 */
export function formatErrorHTML(error: KCLError): string {
  return `
    <div class="kcl-error">
      <div class="error-header">
        <span class="error-type">${getErrorTypeLabel(error.type)}</span>
        ${error.line ? `<span class="error-line">Line ${error.line}</span>` : ''}
      </div>
      <div class="error-message">${error.message}</div>
      ${error.code ? `<code class="error-code">${escapeHtml(error.code.trim())}</code>` : ''}
      ${error.suggestion ? `<div class="error-suggestion">💡 ${error.suggestion}</div>` : ''}
    </div>
  `;
}

function getErrorTypeLabel(type: KCLErrorType): string {
  const labels: Record<KCLErrorType, string> = {
    'SYNTAX_ERROR': '문법 오류',
    'REFERENCE_ERROR': '참조 오류',
    'TYPE_ERROR': '타입 오류',
    'VALUE_ERROR': '값 오류',
    'PARSE_ERROR': '파싱 오류',
    'RUNTIME_ERROR': '런타임 오류',
    'UNKNOWN_ERROR': '알 수 없는 오류',
  };
  return labels[type] || type;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 전체 KCL 코드 검증
 */
export function validateKCL(code: string): KCLParseResult<null> {
  const syntaxErrors = validateKCLCode(code);
  const valueErrors = validateNumericValues(code);
  
  const allErrors = [...syntaxErrors, ...valueErrors];
  
  return {
    success: allErrors.length === 0,
    errors: allErrors,
    warnings: [],
  };
}

export default {
  createError,
  validateKCLCode,
  validateNumericValues,
  validateKCL,
  formatError,
  formatErrorHTML,
};
