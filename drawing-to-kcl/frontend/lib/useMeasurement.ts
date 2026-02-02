/**
 * Measurement Hook
 * Manages measurement state and interactions for 3D CAD
 */

import { useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  MeasureMode,
  MeasurePoint,
  MeasureUnit,
  Measurement,
  createDistanceMeasurement,
  createAngleMeasurement,
  createAreaMeasurement,
  createVolumeMeasurement,
} from './measureEngine';

export interface MeasurementState {
  mode: MeasureMode;
  unit: MeasureUnit;
  measurements: Measurement[];
  pendingPoints: MeasurePoint[];
  isActive: boolean;
}

export interface MeasureClickInfo {
  point: MeasurePoint;
  meshId?: string;
  faceIndex?: number;
  geometry?: THREE.BufferGeometry;
}

export interface UseMeasurementReturn {
  state: MeasurementState;
  setMode: (mode: MeasureMode) => void;
  setUnit: (unit: MeasureUnit) => void;
  handleClick: (info: MeasureClickInfo) => void;
  deleteMeasurement: (id: string) => void;
  clearAllMeasurements: () => void;
  clearPendingPoints: () => void;
  toggleActive: () => void;
}

export function useMeasurement(): UseMeasurementReturn {
  const [mode, setModeInternal] = useState<MeasureMode>('none');
  const [unit, setUnit] = useState<MeasureUnit>('mm');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [pendingPoints, setPendingPoints] = useState<MeasurePoint[]>([]);
  const [isActive, setIsActive] = useState(false);

  // Store pending geometries for area/volume measurements
  const [pendingInfo, setPendingInfo] = useState<MeasureClickInfo | null>(null);

  const setMode = useCallback((newMode: MeasureMode) => {
    setModeInternal(newMode);
    setPendingPoints([]);
    setPendingInfo(null);
  }, []);

  const handleClick = useCallback((info: MeasureClickInfo) => {
    if (mode === 'none' || !isActive) return;

    switch (mode) {
      case 'distance': {
        const newPoints = [...pendingPoints, info.point];
        if (newPoints.length === 2) {
          const measurement = createDistanceMeasurement(newPoints[0], newPoints[1], unit);
          setMeasurements(prev => [...prev, measurement]);
          setPendingPoints([]);
        } else {
          setPendingPoints(newPoints);
        }
        break;
      }

      case 'angle': {
        const newPoints = [...pendingPoints, info.point];
        if (newPoints.length === 3) {
          // Order: point1, vertex (center), point2
          const measurement = createAngleMeasurement(newPoints[0], newPoints[1], newPoints[2]);
          setMeasurements(prev => [...prev, measurement]);
          setPendingPoints([]);
        } else {
          setPendingPoints(newPoints);
        }
        break;
      }

      case 'area': {
        if (info.geometry && info.faceIndex !== undefined && info.meshId) {
          const measurement = createAreaMeasurement(
            info.geometry,
            info.faceIndex,
            info.meshId,
            unit
          );
          setMeasurements(prev => [...prev, measurement]);
        }
        break;
      }

      case 'volume': {
        if (info.geometry && info.meshId) {
          const measurement = createVolumeMeasurement(
            info.geometry,
            info.meshId,
            unit
          );
          setMeasurements(prev => [...prev, measurement]);
        }
        break;
      }
    }
  }, [mode, unit, pendingPoints, isActive]);

  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }, []);

  const clearAllMeasurements = useCallback(() => {
    setMeasurements([]);
    setPendingPoints([]);
    setPendingInfo(null);
  }, []);

  const clearPendingPoints = useCallback(() => {
    setPendingPoints([]);
    setPendingInfo(null);
  }, []);

  const toggleActive = useCallback(() => {
    setIsActive(prev => {
      const newActive = !prev;
      if (!newActive) {
        setPendingPoints([]);
        setPendingInfo(null);
        setModeInternal('none');
      } else {
        setModeInternal('distance'); // Default to distance mode
      }
      return newActive;
    });
  }, []);

  return {
    state: {
      mode,
      unit,
      measurements,
      pendingPoints,
      isActive,
    },
    setMode,
    setUnit,
    handleClick,
    deleteMeasurement,
    clearAllMeasurements,
    clearPendingPoints,
    toggleActive,
  };
}

export default useMeasurement;
