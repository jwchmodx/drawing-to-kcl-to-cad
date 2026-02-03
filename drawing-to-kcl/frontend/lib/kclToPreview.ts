import { buildGeometrySpecFromKcl, parseKCLWithErrors } from '@/lib/geometryRuntime';
import { buildArtifactGraphFromGeometry, extractMeshes } from '@/lib/types/artifactGraph';
import type { KCLError } from '@/lib/kclErrorHandler';

export interface PreviewResult {
  meshes: { id: string; vertices: [number, number, number][]; indices: number[] }[];
  spec: ReturnType<typeof buildGeometrySpecFromKcl> | null;
  graph: ReturnType<typeof buildArtifactGraphFromGeometry> | null;
  errors: KCLError[];
  warnings: KCLError[];
  success: boolean;
}

export function kclCodeToPreview(kclCode: string): PreviewResult {
  const parseResult = parseKCLWithErrors(kclCode);

  if (!parseResult.success || !parseResult.spec) {
    return {
      meshes: [],
      spec: null,
      graph: null,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
      success: false,
    };
  }

  try {
    const graph = buildArtifactGraphFromGeometry(parseResult.spec);
    const meshes = extractMeshes(graph);
    return {
      meshes: meshes.map((m) => ({
        id: m.id,
        vertices: m.vertices as [number, number, number][],
        indices: m.indices,
      })),
      spec: parseResult.spec,
      graph,
      errors: [],
      warnings: parseResult.warnings,
      success: true,
    };
  } catch (error) {
    return {
      meshes: [],
      spec: parseResult.spec,
      graph: null,
      errors: [
        {
          type: 'RUNTIME_ERROR',
          message: error instanceof Error ? error.message : '메시 생성 중 오류 발생',
        },
      ],
      warnings: [],
      success: false,
    };
  }
}
