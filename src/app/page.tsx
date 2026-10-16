'use client';

import { useState, useRef, useCallback, useMemo, useEffect, useSyncExternalStore } from 'react';
import { 
  Download, 
  Plus, 
  Film, 
  AlertTriangle, 
  X, 
  Check, 
  Eye, 
  ExternalLink, 
  Share2,
  Crop,
  Palette,
  Sparkles,
  Type,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { CinemaCanvas } from '@/components/CinemaCanvas';
import { Controls, TabKey } from '@/components/Controls';
import { loadImage } from '@/utils/image';
import { EditorState, Preset, TemplateId } from '@/types/editor';
import { exportCanvasAsImage, renderCinematicFrame } from '@/lib/canvas';
import { computeFrameLayout, getPanBounds, clampPosition } from '@/lib/geometry';
import {
  CINEMATIC_PRESETS,
  applyPresetIntensity,
  getPresetDisplayName,
} from '@/lib/presets';
import { applyTemplate, getTemplateDisplayName } from '@/lib/templates';

const emptySubscribe = () => () => {};

const INITIAL_STATE: EditorState = {
  image: null,
  textType: 'subtitle',
  text: '—Somos guardianes de la bahía—',
  textAuthor: '',
  showAuthor: true,
  textFont: 'sans',
  textAlign: 'center',
  textColor: '#F4EFE6',
  textSize: 35,
  textHorizontalPosition: 50,
  textVerticalPosition: 84, // Cinematic lower third safe margin
  textOpacity: 100,
  textShadow: true,
  showText: true,
  textBackground: false,
  textBackgroundColor: '#000000',
  textBackgroundOpacity: 70,
  textBackgroundRadius: 6,
  textBackgroundPaddingX: 16,
  textBackgroundPaddingY: 8,
  zoom: 1,
  positionX: 0,
  positionY: 0,
  format: 'original',
  fitMode: 'fit',
  letterbox: false,
  preset: 'FILM_35MM',
  presetIntensity: 100,
  ...CINEMATIC_PRESETS.FILM_35MM.values,
};

export default function Home() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [state, setState] = useState<EditorState>(INITIAL_STATE);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportPreview, setExportPreview] = useState<{ blobUrl: string; blob: Blob; filename: string } | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<TabKey>('encuadre');
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Transient comparison interaction handlers
  const startComparison = useCallback(() => {
    if (state.image) {
      setIsComparing(true);
    }
  }, [state.image]);

  const stopComparison = useCallback(() => {
    setIsComparing(false);
  }, []);

  // Global safety listener: release comparison on any window-level pointerup, blur, or cancel
  useEffect(() => {
    if (!isComparing) return;

    const handleGlobalRelease = () => {
      setIsComparing(false);
    };

    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);
    window.addEventListener('contextmenu', handleGlobalRelease);

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
      window.removeEventListener('contextmenu', handleGlobalRelease);
    };
  }, [isComparing]);

  // Keyboard accessibility: hold Space or Enter on the button to compare
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Enter') && !isComparing && state.image) {
        e.preventDefault();
        setIsComparing(true);
      }
    },
    [isComparing, state.image]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsComparing(false);
      }
    },
    []
  );

  const handleImageLoaded = async (file: File) => {
    try {
      const img = await loadImage(file);
      setState({
        ...INITIAL_STATE,
        image: img,
        zoom: 1,
        positionX: 0,
        positionY: 0,
        format: 'original',
        fitMode: 'fit',
        letterbox: false,
        preset: 'FILM_35MM',
        presetIntensity: 100,
        ...CINEMATIC_PRESETS.FILM_35MM.values,
      });
    } catch (error) {
      console.error('Error loading image', error);
      alert('No se pudo cargar la imagen.');
    }
  };

  const handleStateChange = useCallback((updates: Partial<EditorState>) => {
    setState((prev) => {
      const merged: EditorState = { ...INITIAL_STATE, ...prev, ...updates };

      // Ensure panning and zoom stay strictly clamped to valid boundaries
      if (merged.image) {
        const layout = computeFrameLayout(merged.format, merged.image, merged.letterbox);
        const bounds = getPanBounds(merged.image, layout.imageArea, merged.fitMode, merged.zoom ?? 1);
        const clamped = clampPosition(merged.positionX ?? 0, merged.positionY ?? 0, bounds);
        merged.positionX = clamped.positionX;
        merged.positionY = clamped.positionY;
      }

      // If color/effects changed manually, switch to CUSTOM unless we are applying a preset
      if (
        updates.exposure !== undefined ||
        updates.contrast !== undefined ||
        updates.saturation !== undefined ||
        updates.temperature !== undefined ||
        updates.highlights !== undefined ||
        updates.shadows !== undefined ||
        updates.grain !== undefined ||
        updates.vignette !== undefined
      ) {
        if (updates.preset === undefined && updates.presetIntensity === undefined) {
          merged.preset = 'CUSTOM';
        }
      }

      // If typography/layout changed manually, switch template to CUSTOM unless we are applying a template
      if (
        updates.textType !== undefined ||
        updates.textFont !== undefined ||
        updates.textAlign !== undefined ||
        updates.textColor !== undefined ||
        updates.textSize !== undefined ||
        updates.textHorizontalPosition !== undefined ||
        updates.textVerticalPosition !== undefined ||
        updates.textOpacity !== undefined ||
        updates.textShadow !== undefined ||
        updates.showAuthor !== undefined ||
        updates.textBackground !== undefined ||
        updates.textBackgroundColor !== undefined ||
        updates.textBackgroundOpacity !== undefined ||
        updates.textBackgroundRadius !== undefined ||
        updates.textBackgroundPaddingX !== undefined ||
        updates.textBackgroundPaddingY !== undefined
      ) {
        if (updates.template === undefined) {
          merged.template = 'CUSTOM';
        }
      }

      return merged;
    });
  }, []);

  const handlePanChange = useCallback((positionX: number, positionY: number) => {
    setState((prev) => ({
      ...prev,
      positionX,
      positionY,
    }));
  }, []);

  const handleResetFraming = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoom: 1,
      positionX: 0,
      positionY: 0,
      letterbox: false,
    }));
  }, []);

  const handlePresetSelect = useCallback((preset: Preset) => {
    if (preset === 'CUSTOM') return;
    setState((prev) => {
      const intensity = prev.presetIntensity ?? 100;
      const values = applyPresetIntensity(CINEMATIC_PRESETS[preset].values, intensity);
      return {
        ...prev,
        ...values,
        preset,
      };
    });
  }, []);

  const handlePresetIntensityChange = useCallback((intensity: number) => {
    setState((prev) => {
      if (prev.preset === 'CUSTOM' || prev.preset === 'ORIGINAL') {
        return { ...prev, presetIntensity: intensity };
      }
      const values = applyPresetIntensity(CINEMATIC_PRESETS[prev.preset].values, intensity);
      return {
        ...prev,
        ...values,
        presetIntensity: intensity,
      };
    });
  }, []);

  const handleTemplateSelect = useCallback((templateId: TemplateId) => {
    setState((prev) => {
      const templateUpdates = applyTemplate(prev, templateId);
      return {
        ...prev,
        ...templateUpdates,
      };
    });
  }, []);

  const handleResetText = useCallback(() => {
    setState((prev) => ({
      ...prev,
      textType: 'subtitle',
      textFont: 'sans',
      textAlign: 'center',
      textColor: '#F4EFE6',
      textSize: 35,
      textHorizontalPosition: 50,
      textVerticalPosition: 84,
      textOpacity: 100,
      textShadow: true,
      showAuthor: true,
      textBackground: false,
      textBackgroundColor: '#000000',
      textBackgroundOpacity: 70,
      textBackgroundRadius: 6,
      textBackgroundPaddingX: 16,
      textBackgroundPaddingY: 8,
      template: undefined,
    }));
  }, []);

  const handleResetTexture = useCallback(() => {
    setState((prev) => ({
      ...prev,
      grain: 0,
      vignette: 0,
    }));
  }, []);

  const handleCurrentCategoryReset = useCallback(() => {
    switch (activeCategory) {
      case 'encuadre':
        handleResetFraming();
        break;
      case 'color':
        handlePresetSelect('ORIGINAL');
        break;
      case 'textura':
        handleResetTexture();
        break;
      case 'texto':
        handleResetText();
        break;
    }
  }, [activeCategory, handleResetFraming, handlePresetSelect, handleResetTexture, handleResetText]);

  const handleMobileCategoryClick = useCallback((category: TabKey) => {
    if (activeCategory === category) {
      setIsMobilePanelOpen((prev) => !prev);
    } else {
      setActiveCategory(category);
      setIsMobilePanelOpen(true);
    }
  }, [activeCategory]);

  const handleDownload = useCallback(async () => {
    if (!state.image || isExporting) return;
    setIsExporting(true);
    setExportErrorMessage(null);
    try {
      // Guarantee that the exported JPG is ALWAYS the fully edited result,
      // even if the user happens to hold the comparison button during export!
      const offscreenCanvas = document.createElement('canvas');
      renderCinematicFrame({ state, canvas: offscreenCanvas, showOriginal: false });
      const result = await exportCanvasAsImage(offscreenCanvas, 'frame.jpg');

      if (result.method === 'preview') {
        // Fallback for iOS Safari / environments where direct download cannot be initiated:
        // Open dedicated in-app preview modal so user can save directly to Photos
        if (exportPreview?.blobUrl) {
          URL.revokeObjectURL(exportPreview.blobUrl);
        }
        setExportPreview({
          blobUrl: result.blobUrl,
          blob: result.blob,
          filename: 'frame.jpg',
        });
      } else if (!result.canceled) {
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2500);
      }
    } catch (error) {
      console.error('Export error:', error);
      setExportErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo exportar la fotografía. Por favor inténtalo de nuevo.'
      );
    } finally {
      setIsExporting(false);
    }
  }, [state, isExporting, exportPreview]);

  const handleCloseExportPreview = useCallback(() => {
    if (exportPreview?.blobUrl) {
      URL.revokeObjectURL(exportPreview.blobUrl);
    }
    setExportPreview(null);
  }, [exportPreview]);

  const handleShareFromModal = useCallback(async () => {
    if (!exportPreview) return;
    const file = new File([exportPreview.blob], exportPreview.filename, { type: 'image/jpeg' });
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          files: [file],
          title: 'FRAME — Fotografía cinematográfica',
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setExportErrorMessage('No se pudo abrir la hoja de compartir del sistema.');
      }
    }
  }, [exportPreview]);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const handleConfirmNewImage = () => {
    setState(INITIAL_STATE);
    setShowConfirmModal(false);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showConfirmModal) setShowConfirmModal(false);
        if (exportPreview?.blobUrl) {
          URL.revokeObjectURL(exportPreview.blobUrl);
          setExportPreview(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal, exportPreview]);

  // Dynamic container observation for seamless responsive canvas scaling
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      setContainerDimensions({
        width: el.clientWidth,
        height: el.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [state.image, isMobilePanelOpen]);

  // Derived layout calculations for canvas aspect-ratio fitting
  const frameSize = useMemo(
    () => computeFrameLayout(state.format, state.image, state.letterbox).canvas,
    [state.format, state.image, state.letterbox]
  );
  const frameRatio = frameSize.width / frameSize.height;

  // Auto-calculate exact canvas fit inside the available container bounds
  const canvasFit = useMemo(() => {
    const pad = 16;
    const availW = Math.max(0, containerDimensions.width - pad);
    const availH = Math.max(0, containerDimensions.height - pad);

    if (availW <= 0 || availH <= 0 || frameRatio <= 0) {
      return {
        width: '100%',
        height: 'auto',
        maxWidth: '100%',
        maxHeight: '100%',
      };
    }

    const containerRatio = availW / availH;
    let w: number;
    let h: number;

    if (containerRatio > frameRatio) {
      h = availH;
      w = Math.round(availH * frameRatio);
    } else {
      w = availW;
      h = Math.round(availW / frameRatio);
    }

    return {
      width: `${w}px`,
      height: `${h}px`,
      maxWidth: '100%',
      maxHeight: '100%',
    };
  }, [containerDimensions, frameRatio]);

  const CATEGORIES: {
    id: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'encuadre', label: 'Encuadre', icon: Crop },
    { id: 'color', label: 'Color', icon: Palette },
    { id: 'textura', label: 'Textura', icon: Sparkles },
    { id: 'texto', label: 'Texto', icon: Type },
  ];

  if (!isMounted) {
    return (
      <div 
        className="h-screen h-[100dvh] bg-[#0A0A0B] text-[#EAE8E2] flex flex-col font-sans selection:bg-[#2A2A32] overflow-hidden"
        suppressHydrationWarning
      />
    );
  }

  return (
    <div 
      className="h-screen h-[100dvh] bg-[#0A0A0B] text-[#EAE8E2] flex flex-col font-sans selection:bg-[#2A2A32] overflow-hidden"
      suppressHydrationWarning
    >
      
      {/* ============================================================== */}
      {/* ZONE 1: EDITORIAL COMPACT HEADER                               */}
      {/* ============================================================== */}
      <header className="h-13 sm:h-14 lg:h-16 shrink-0 border-b border-[#1F1F24] bg-[#0E0E10] px-3 sm:px-6 lg:px-8 flex items-center justify-between z-20">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-serif tracking-[0.25em] text-[#EAE8E2] select-none font-medium">
              FRAME
            </h1>
            <span className="hidden sm:inline-block text-[10px] tracking-[0.15em] text-[#686662] uppercase font-mono border-l border-[#232328] pl-2.5">
              Laboratorio Fotográfico
            </span>
          </div>
        </div>

        {/* Center: Live Frame Metadata Indicators (Desktop only) */}
        {state.image && (
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#141417] border border-[#232328] text-[11px] font-mono text-[#9E9C96]">
            <span className="flex items-center gap-1.5 text-[#EAE8E2]">
              <Film className="w-3 h-3 text-[#D8C7A5]" />
              <span className="uppercase">{state.format}</span>
            </span>
            <span className="text-[#3E3C36]">·</span>
            <span className="text-[#D8C7A5]">
              {getPresetDisplayName(state.preset)}
              {state.preset !== 'ORIGINAL' &&
                state.preset !== 'CUSTOM' &&
                (state.presetIntensity ?? 100) !== 100 && (
                  <span className="text-[#9E9C96] text-[10px] ml-1">
                    ({state.presetIntensity}%)
                  </span>
                )}
            </span>
            {state.template && (
              <>
                <span className="text-[#3E3C36]">·</span>
                <span className="text-[#EAE8E2]">
                  {getTemplateDisplayName(state.template)}
                </span>
              </>
            )}
            <span className="text-[#3E3C36]">·</span>
            <span className="flex items-center gap-1.5 text-[#686662]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-pulse" />
              <span>Edición activa</span>
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {state.image && (
            <>
              {/* Botón «Ver original» con soporte ratón, táctil y teclado */}
              <button
                type="button"
                id="btn-ver-original"
                aria-label="Ver fotografía original (mantener pulsado)"
                aria-pressed={isComparing}
                onPointerDown={startComparison}
                onPointerUp={stopComparison}
                onPointerCancel={stopComparison}
                onPointerLeave={stopComparison}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onBlur={stopComparison}
                onContextMenu={(e) => e.preventDefault()}
                className={`h-8 sm:h-9 px-2.5 sm:px-3.5 text-xs font-medium rounded-md border transition-all flex items-center gap-1.5 select-none touch-none cursor-pointer ${
                  isComparing
                    ? 'bg-[#D8C7A5] text-[#0A0A0B] border-[#D8C7A5] font-semibold shadow-md ring-2 ring-[#D8C7A5]/40'
                    : 'bg-[#141417] text-[#EAE8E2] border-[#2B2B32] hover:bg-[#1C1C22]'
                }`}
                title="Mantén pulsado para comparar con la foto original"
              >
                <Eye className={`w-3.5 h-3.5 ${isComparing ? 'text-[#0A0A0B]' : 'text-[#D8C7A5]'}`} />
                <span className="hidden sm:inline tracking-wide">
                  {isComparing ? 'Viendo original…' : 'Ver original'}
                </span>
                <span className="sm:hidden tracking-wide text-[11px]">
                  {isComparing ? 'Original…' : 'Original'}
                </span>
              </button>

              {/* Nueva Imagen */}
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-medium text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D] border border-[#232328] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="Cargar una nueva fotografía"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nueva imagen</span>
              </button>

              {/* Exportar JPG Principal */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="h-8 sm:h-9 px-3 sm:px-4 bg-[#EAE8E2] hover:bg-white text-[#0A0A0B] text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm tracking-wide disabled:opacity-50"
              >
                {exportSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                    <span className="hidden xs:inline">¡Exportado!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExporting ? 'Exportando…' : 'Exportar JPG'}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN WORKSPACE                                                 */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 relative overflow-hidden">
        
        {!state.image ? (
          /* INITIAL VIEW: HERO DROPZONE */
          <div className="flex-1 overflow-y-auto px-4 py-8 md:py-20 flex items-center justify-center">
            <ImageUploader onImageLoaded={handleImageLoaded} />
          </div>
        ) : (
          <>
            {/* ZONE 2: MAIN PREVIEW WORKSPACE */}
            <div 
              ref={canvasContainerRef}
              className="flex-1 bg-[#070709] relative flex flex-col items-center justify-center p-2 sm:p-4 lg:p-8 min-h-0 min-w-0 overflow-hidden"
            >
              
              {/* CANVAS WRAPPER — dynamically fitted to available viewport bounds without overflow */}
              <div
                className="relative bg-black overflow-hidden rounded-[2px] transition-all flex items-center justify-center shrink-0"
                style={{
                  aspectRatio: `${frameSize.width} / ${frameSize.height}`,
                  ...canvasFit,
                  boxShadow: '0 0 0 1px #232328, 0 25px 50px -12px rgba(0,0,0,0.7)',
                }}
              >
                {/* Active Comparison Badge Overlay */}
                {isComparing && (
                  <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-200 font-mono text-[10px] sm:text-[11px] uppercase tracking-wider shadow-lg animate-in fade-in duration-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Original (sin procesar)</span>
                  </div>
                )}

                <CinemaCanvas
                  state={state}
                  showOriginal={isComparing}
                  onCanvasReady={handleCanvasReady}
                  onPanChange={handlePanChange}
                  className="block w-full h-full"
                />
              </div>

              {/* Floating button to re-open panel when collapsed on mobile */}
              {!isMobilePanelOpen && (
                <button
                  type="button"
                  onClick={() => setIsMobilePanelOpen(true)}
                  className="lg:hidden absolute bottom-3 z-20 px-3.5 py-1.5 rounded-full bg-[#16161A]/90 backdrop-blur-md border border-[#2E2E38] text-[#D8C7A5] text-[11px] font-medium flex items-center gap-1.5 shadow-xl animate-in fade-in cursor-pointer hover:bg-[#202026]"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Ajustes ({CATEGORIES.find((c) => c.id === activeCategory)?.label})</span>
                </button>
              )}

              {/* Interaction tip & tactile comparison button below canvas (Desktop only) */}
              <div className="hidden lg:flex mt-3 items-center justify-between gap-3 w-full max-w-xl px-2 shrink-0">
                <span className="text-[10px] text-[#52504C] font-mono">
                  💡 Arrastra con el ratón o desliza sobre el lienzo para reencuadrar
                </span>
                <button
                  type="button"
                  aria-label="Ver fotografía original (mantener pulsado)"
                  aria-pressed={isComparing}
                  onPointerDown={startComparison}
                  onPointerUp={stopComparison}
                  onPointerCancel={stopComparison}
                  onPointerLeave={stopComparison}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  onBlur={stopComparison}
                  onContextMenu={(e) => e.preventDefault()}
                  className={`text-[11px] font-mono px-3 py-1.5 rounded-md border transition-all flex items-center gap-1.5 select-none touch-none cursor-pointer ml-auto ${
                    isComparing
                      ? 'bg-[#D8C7A5] text-[#0A0A0B] border-[#D8C7A5] font-semibold shadow-sm'
                      : 'bg-[#121215] text-[#9E9C96] border-[#232328] hover:text-[#EAE8E2] hover:border-[#383842]'
                  }`}
                  title="Mantén pulsado para comparar con la foto original"
                >
                  <Eye className={`w-3.5 h-3.5 ${isComparing ? 'text-[#0A0A0B]' : 'text-[#D8C7A5]'}`} />
                  <span>{isComparing ? 'Soltar para volver a edición' : 'Mantener pulsado para ver original'}</span>
                </button>
              </div>
            </div>

            {/* ZONE 3A: DESKTOP MODULAR CONTROLS SIDEBAR */}
            <aside 
              aria-label="Panel de configuración cinematográfica"
              className="hidden lg:flex w-[380px] xl:w-[420px] shrink-0 border-l border-[#232328] bg-[#0E0E10] flex-col h-full overflow-hidden"
            >
              <Controls
                state={state}
                activeTab={activeCategory}
                onTabChange={setActiveCategory}
                onChange={handleStateChange}
                onDownload={handleDownload}
                onPresetSelect={handlePresetSelect}
                onPresetIntensityChange={handlePresetIntensityChange}
                onTemplateSelect={handleTemplateSelect}
                onReset={() => setState({ ...INITIAL_STATE, image: state.image })}
                onResetFraming={handleResetFraming}
                onResetColor={() => handlePresetSelect('ORIGINAL')}
                onResetText={handleResetText}
              />
            </aside>

            {/* ZONE 3B: MOBILE BOTTOM EDITING SHEET & NAVIGATION */}
            <section 
              aria-label="Zona de edición móvil"
              className="lg:hidden shrink-0 border-t border-[#232328] bg-[#0E0E10] flex flex-col z-30 transition-all duration-300 ease-in-out"
            >
              {/* EXPANDABLE CONTROLS DRAWER */}
              {isMobilePanelOpen && (
                <div className="h-[44dvh] max-h-[48dvh] flex flex-col overflow-hidden border-b border-[#1F1F24]">
                  {/* Category Sub-Header */}
                  <div className="h-10 px-3 sm:px-4 border-b border-[#232328] bg-[#121215] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const currentCat = CATEGORIES.find((c) => c.id === activeCategory);
                        const Icon = currentCat?.icon ?? Crop;
                        return (
                          <>
                            <Icon className="w-3.5 h-3.5 text-[#D8C7A5]" />
                            <span className="text-xs font-semibold tracking-wide text-[#EAE8E2]">
                              {currentCat?.label}
                            </span>
                          </>
                        );
                      })()}
                      {activeCategory === 'color' && state.preset !== 'ORIGINAL' && (
                        <span className="text-[10px] text-[#D8C7A5] font-mono bg-[#1E1E24] px-1.5 py-0.5 rounded border border-[#2B2B34]">
                          {getPresetDisplayName(state.preset)}
                        </span>
                      )}
                      {activeCategory === 'texto' && state.template && (
                        <span className="text-[10px] text-[#D8C7A5] font-mono bg-[#1E1E24] px-1.5 py-0.5 rounded border border-[#2B2B34]">
                          {getTemplateDisplayName(state.template)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCurrentCategoryReset}
                        className="text-[11px] text-[#9E9C96] hover:text-[#EAE8E2] px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Restablecer ajustes de esta sección"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restablecer</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setIsMobilePanelOpen(false)}
                        className="text-[11px] text-[#9E9C96] hover:text-[#EAE8E2] px-2 py-1 rounded bg-[#18181D] border border-[#26262E] transition-colors flex items-center gap-1 cursor-pointer"
                        title="Contraer panel para ver la imagen completa"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-[#D8C7A5]" />
                        <span className="text-[10px]">Ocultar</span>
                      </button>
                    </div>
                  </div>

                  {/* Panel content (isolated scroll) */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <Controls
                      state={state}
                      activeTab={activeCategory}
                      onTabChange={setActiveCategory}
                      onChange={handleStateChange}
                      onDownload={handleDownload}
                      onPresetSelect={handlePresetSelect}
                      onPresetIntensityChange={handlePresetIntensityChange}
                      onTemplateSelect={handleTemplateSelect}
                      onReset={() => setState({ ...INITIAL_STATE, image: state.image })}
                      onResetFraming={handleResetFraming}
                      onResetColor={() => handlePresetSelect('ORIGINAL')}
                      onResetText={handleResetText}
                      hideTabsHeader={true}
                      hideFooterActions={true}
                    />
                  </div>
                </div>
              )}

              {/* DOCKED BOTTOM CATEGORY NAVIGATION BAR */}
              <nav
                role="tablist"
                aria-label="Categorías de edición cinematográfica"
                className="h-13 border-t border-[#232328] bg-[#121215] grid grid-cols-4 items-center shrink-0 select-none"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              >
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      id={`mobile-tab-${cat.id}`}
                      aria-selected={isActive}
                      aria-expanded={isActive && isMobilePanelOpen}
                      aria-controls={`mobile-panel-${cat.id}`}
                      onClick={() => handleMobileCategoryClick(cat.id)}
                      className={`flex flex-col items-center justify-center py-1.5 relative transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D8C7A5] ${
                        isActive
                          ? 'text-[#EAE8E2] bg-[#16161A]'
                          : 'text-[#8E8C86] hover:text-[#C5C3BD]'
                      }`}
                    >
                      <div className="relative">
                        <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#D8C7A5]' : 'text-[#706E69]'}`} />
                        {isActive && (
                          <span className="absolute -top-1 -right-2.5 w-1.5 h-1.5 rounded-full bg-[#D8C7A5]" />
                        )}
                      </div>
                      <span className={`text-[10px] mt-0.5 tracking-wide ${isActive ? 'font-semibold text-[#EAE8E2]' : 'font-normal'}`}>
                        {cat.label}
                      </span>
                      {isActive && (
                        <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-[#D8C7A5]" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </section>
          </>
        )}
      </main>

      {/* ============================================================== */}
      {/* CONFIRMATION MODAL: NUEVA IMAGEN                               */}
      {/* ============================================================== */}
      {showConfirmModal && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="confirm-modal-title"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-[#141417] border border-[#26262B] rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="confirm-modal-title" className="text-base font-semibold text-[#EAE8E2]">
                    ¿Cargar una nueva fotografía?
                  </h3>
                  <p className="text-xs text-[#9E9C96] mt-0.5">
                    Se perderán los ajustes de encuadre, color y texto actuales.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-[#686662] hover:text-[#EAE8E2] transition-colors p-1"
                aria-label="Cerrar diálogo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#0F0F12] border border-[#1E1E22] rounded-lg text-xs text-[#9E9C96] leading-relaxed">
              Si deseas conservar este fotograma, asegúrate de haber pulsado <strong className="text-[#EAE8E2]">«Exportar JPG»</strong> antes de continuar.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#9E9C96] hover:text-[#EAE8E2] rounded-md transition-colors cursor-pointer"
              >
                Continuar editando
              </button>
              <button
                type="button"
                onClick={handleConfirmNewImage}
                className="px-4 py-2 bg-rose-900/80 hover:bg-rose-800 text-rose-100 text-xs font-semibold rounded-md border border-rose-700/50 transition-colors cursor-pointer"
              >
                Nueva fotografía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE EXPORTACIÓN (FALLBACK PARA SAFARI / iOS)               */}
      {/* ============================================================== */}
      {exportPreview && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="export-modal-title"
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-[#141417] border border-[#2B2B32] rounded-xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#232328] pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1F1F26] border border-[#30303A] flex items-center justify-center text-[#D8C7A5]">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="export-modal-title" className="text-sm font-semibold text-[#EAE8E2]">
                    Fotografía exportada
                  </h3>
                  <p className="text-[11px] text-[#9E9C96]">
                    JPG cinematográfico en alta resolución
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseExportPreview}
                className="text-[#686662] hover:text-[#EAE8E2] p-1.5 transition-colors cursor-pointer"
                aria-label="Cerrar vista previa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Imagen exportada */}
            <div className="flex-1 min-h-0 flex items-center justify-center bg-[#070709] rounded-lg p-2 border border-[#1E1E22] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={exportPreview.blobUrl}
                alt="Fotografía cinematográfica procesada"
                className="max-h-[45vh] w-auto max-w-full object-contain rounded select-none shadow-md"
              />
            </div>

            {/* Instrucción para Safari en iOS */}
            <div className="p-3 bg-[#111115] border border-[#232328] rounded-lg space-y-1 shrink-0">
              <p className="text-xs text-[#D8C7A5] font-medium flex items-center gap-1.5">
                <span>📱 Guardar en iPhone / Safari:</span>
              </p>
              <p className="text-[11px] text-[#9E9C96] leading-relaxed">
                Mantén pulsada la imagen con el dedo y pulsa <strong className="text-[#EAE8E2]">«Guardar en Fotos»</strong>, o utiliza los botones de acción siguientes.
              </p>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1 shrink-0">
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  type="button"
                  onClick={handleShareFromModal}
                  className="h-9 px-3.5 bg-[#D8C7A5] hover:bg-[#E5D7B7] text-[#0A0A0B] text-xs font-semibold rounded-md transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Compartir / Guardar</span>
                </button>
              )}

              <a
                href={exportPreview.blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-3.5 bg-[#18181D] hover:bg-[#202026] text-[#EAE8E2] text-xs font-medium rounded-md border border-[#2D2D35] transition-all flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#D8C7A5]" />
                <span>Abrir en pestaña nueva</span>
              </a>

              <a
                href={exportPreview.blobUrl}
                download="frame.jpg"
                className="h-9 px-4 bg-[#EAE8E2] hover:bg-white text-[#0A0A0B] text-xs font-semibold rounded-md transition-all flex items-center gap-2 cursor-pointer shadow-sm tracking-wide"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar archivo</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* NOTIFICACIÓN TOAST DE ERROR DE EXPORTACIÓN                     */}
      {/* ============================================================== */}
      {exportErrorMessage && (
        <div 
          role="alert"
          className="fixed bottom-6 right-6 z-50 bg-[#1C1414] border border-rose-700/60 text-rose-200 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 max-w-sm"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="flex-1">{exportErrorMessage}</span>
          <button
            type="button"
            onClick={() => setExportErrorMessage(null)}
            className="text-rose-400 hover:text-rose-100 p-0.5 cursor-pointer"
            aria-label="Cerrar mensaje de error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

    </div>
  );
}
