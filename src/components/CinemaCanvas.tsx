import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState } from '@/types/editor';
import { renderCinematicFrame } from '@/lib/canvas';
import {
  computeFrameLayout,
  computeBaseImageDimensions,
  getPanBounds,
  clampPosition,
} from '@/lib/geometry';

interface CinemaCanvasProps {
  state: EditorState;
  className?: string;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
  onPanChange?: (positionX: number, positionY: number) => void;
}

export function CinemaCanvas({
  state,
  className = '',
  onCanvasReady,
  onPanChange,
}: CinemaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    initialPosX: number;
    initialPosY: number;
    drawWidth: number;
    drawHeight: number;
    bounds: ReturnType<typeof getPanBounds>;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state.image) return;

    renderCinematicFrame({ state, canvas });

    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [state, onCanvasReady]);

  // --- INTERACTIVE POINTER PANNING ---
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!onPanChange || !state.image) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const layout = computeFrameLayout(state.format, state.image, state.letterbox);
      const base = computeBaseImageDimensions(state.image, layout.imageArea, state.fitMode);
      const drawWidth = base.width * state.zoom;
      const drawHeight = base.height * state.zoom;
      const bounds = getPanBounds(state.image, layout.imageArea, state.fitMode, state.zoom);

      // Only allow drag if panning is possible in at least one axis
      if (!bounds.canPanX && !bounds.canPanY) return;

      canvas.setPointerCapture(e.pointerId);
      setIsDragging(true);

      dragStartRef.current = {
        pointerX: e.clientX,
        pointerY: e.clientY,
        initialPosX: state.positionX,
        initialPosY: state.positionY,
        drawWidth,
        drawHeight,
        bounds,
      };
    },
    [onPanChange, state.image, state.format, state.letterbox, state.fitMode, state.zoom, state.positionX, state.positionY]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDragging || !dragStartRef.current || !onPanChange) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const { pointerX, pointerY, initialPosX, initialPosY, drawWidth, drawHeight, bounds } =
        dragStartRef.current;

      const deltaScreenX = e.clientX - pointerX;
      const deltaScreenY = e.clientY - pointerY;

      // Convert screen delta to internal canvas pixels
      const scaleCanvasX = canvas.width / rect.width;
      const scaleCanvasY = canvas.height / rect.height;

      const deltaCanvasX = deltaScreenX * scaleCanvasX;
      const deltaCanvasY = deltaScreenY * scaleCanvasY;

      // In geometry.ts, panX = (positionX / 100) * drawWidth
      // => deltaPosition = (deltaCanvas / drawWidth) * 100
      const deltaPosX = drawWidth > 0 ? (deltaCanvasX / drawWidth) * 100 : 0;
      const deltaPosY = drawHeight > 0 ? (deltaCanvasY / drawHeight) * 100 : 0;

      const targetX = initialPosX + deltaPosX;
      const targetY = initialPosY + deltaPosY;

      const clamped = clampPosition(targetX, targetY, bounds);
      onPanChange(clamped.positionX, clamped.positionY);
    },
    [isDragging, onPanChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isDragging) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          // ignore if already released
        }
        setIsDragging(false);
        dragStartRef.current = null;
      }
    },
    [isDragging]
  );

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`${className} touch-none ${
        onPanChange ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      }`}
    />
  );
}
