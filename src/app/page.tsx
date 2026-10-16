'use client';

import { useState, useRef, useCallback, useMemo, useEffect, useSyncExternalStore } from 'react';
import { Download, Plus, Film, AlertTriangle, X, Check } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { CinemaCanvas } from '@/components/CinemaCanvas';
import { Controls } from '@/components/Controls';
import { loadImage } from '@/utils/image';
import { EditorState, Preset, PresetValues } from '@/types/editor';
import { exportCanvasAsImage } from '@/lib/canvas';
import { computeFrameLayout, getPanBounds, clampPosition } from '@/lib/geometry';

const emptySubscribe = () => () => {};

const PRESETS: Record<Exclude<Preset, 'CUSTOM'>, PresetValues> = {
  CINEMA: { contrast: 8, saturation: -5, temperature: -2, highlights: -8, grain: 8, vignette: 8 },
  INDIE: { contrast: 12, saturation: -15, temperature: -5, highlights: -15, grain: 14, vignette: 12 },
  VINTAGE: { contrast: 5, saturation: -15, temperature: 8, highlights: -5, grain: 20, vignette: 14 },
};

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
  zoom: 1,
  positionX: 0,
  positionY: 0,
  ...PRESETS.CINEMA,
  format: 'original',
  fitMode: 'fit',
  letterbox: false,
  preset: 'CINEMA',
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        preset: 'CINEMA',
        ...PRESETS.CINEMA,
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
        updates.contrast !== undefined ||
        updates.saturation !== undefined ||
        updates.temperature !== undefined ||
        updates.highlights !== undefined ||
        updates.grain !== undefined ||
        updates.vignette !== undefined
      ) {
        if (updates.preset === undefined) {
          merged.preset = 'CUSTOM';
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
    setState((prev) => ({
      ...prev,
      ...PRESETS[preset],
      preset,
    }));
  }, []);

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await exportCanvasAsImage(canvasRef.current, 'frame.jpg');
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

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
      if (e.key === 'Escape' && showConfirmModal) {
        setShowConfirmModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmModal]);

  // Derived layout calculations for canvas aspect-ratio fitting
  const frameSize = useMemo(
    () => computeFrameLayout(state.format, state.image, state.letterbox).canvas,
    [state.format, state.image, state.letterbox]
  );
  const frameRatio = frameSize.width / frameSize.height;

  if (!isMounted) {
    return (
      <div 
        className="min-h-screen bg-[#0A0A0B] text-[#EAE8E2] flex flex-col font-sans selection:bg-[#2A2A32] overflow-x-hidden"
        suppressHydrationWarning
      />
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#0A0A0B] text-[#EAE8E2] flex flex-col font-sans selection:bg-[#2A2A32] overflow-x-hidden"
      suppressHydrationWarning
    >
      
      {/* ============================================================== */}
      {/* EDITORIAL HEADER                                               */}
      {/* ============================================================== */}
      <header className="h-16 shrink-0 border-b border-[#1F1F24] bg-[#0E0E10] px-4 md:px-8 flex items-center justify-between z-20 sticky top-0">
        
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl md:text-2xl font-serif tracking-[0.25em] text-[#EAE8E2] select-none font-medium">
              FRAME
            </h1>
            <span className="hidden sm:inline-block text-[10px] tracking-[0.15em] text-[#686662] uppercase font-mono border-l border-[#232328] pl-2.5">
              Laboratorio Fotográfico
            </span>
          </div>
        </div>

        {/* Center: Live Frame Metadata Indicators (only when image is loaded) */}
        {state.image && (
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#141417] border border-[#232328] text-[11px] font-mono text-[#9E9C96]">
            <span className="flex items-center gap-1.5 text-[#EAE8E2]">
              <Film className="w-3 h-3 text-[#D8C7A5]" />
              <span className="uppercase">{state.format}</span>
            </span>
            <span className="text-[#3E3C36]">·</span>
            <span className="text-[#D8C7A5]">
              {state.preset === 'CUSTOM' ? 'Personalizado' : state.preset}
            </span>
            <span className="text-[#3E3C36]">·</span>
            <span className="flex items-center gap-1.5 text-[#686662]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-pulse" />
              <span>Edición activa</span>
            </span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {state.image && (
            <>
              {/* Nueva Imagen */}
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="h-9 px-3 text-xs font-medium text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D] border border-[#232328] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
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
                className="h-9 px-4 bg-[#EAE8E2] hover:bg-white text-[#0A0A0B] text-xs font-semibold rounded-md transition-all flex items-center gap-2 cursor-pointer shadow-sm tracking-wide disabled:opacity-50"
              >
                {exportSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                    <span>¡Exportado!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{isExporting ? 'Procesando...' : 'Exportar JPG'}</span>
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
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
        
        {!state.image ? (
          /* INITIAL VIEW: HERO DROPZONE */
          <div className="flex-1 overflow-y-auto px-4 py-12 md:py-20 flex items-center justify-center">
            <ImageUploader onImageLoaded={handleImageLoaded} />
          </div>
        ) : (
          /* 2-COLUMN EDITORIAL WORKSPACE */
          <>
            {/* COLUMN 1: CINEMA CANVAS WORKSPACE */}
            <div className="flex-1 bg-[#070709] relative flex flex-col items-center justify-center p-4 md:p-8 min-h-[50vh] lg:min-h-0 overflow-hidden">
              
              {/* CANVAS WRAPPER — aspect-ratio mirrors canvas dimensions, auto-fitted without overflow */}
              <div
                className="relative bg-black overflow-hidden rounded-[2px] transition-all"
                style={{
                  aspectRatio: `${frameSize.width} / ${frameSize.height}`,
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 120px)',
                  width: `min(100%, calc((100vh - 120px) * ${frameRatio}))`,
                  boxShadow: '0 0 0 1px #232328, 0 25px 50px -12px rgba(0,0,0,0.7)',
                }}
              >
                <CinemaCanvas
                  state={state}
                  onCanvasReady={handleCanvasReady}
                  onPanChange={handlePanChange}
                  className="block w-full h-full"
                />
              </div>

              {/* Subtle interaction tip below canvas */}
              <div className="mt-3 hidden sm:flex items-center gap-1.5 text-[10px] text-[#52504C] font-mono">
                <span>💡 Arrastra con el ratón o desliza sobre el lienzo para reencuadrar</span>
              </div>
            </div>

            {/* COLUMN 2: MODULAR CONTROLS SIDEBAR */}
            <aside 
              aria-label="Panel de configuración cinematográfica"
              className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#232328] bg-[#0E0E10] flex flex-col h-auto lg:h-[calc(100vh-64px)] lg:sticky lg:top-16"
            >
              <Controls
                state={state}
                onChange={handleStateChange}
                onDownload={handleDownload}
                onPresetSelect={handlePresetSelect}
                onReset={() => setState({ ...INITIAL_STATE, image: state.image })}
                onResetFraming={handleResetFraming}
                onResetColor={() => handlePresetSelect('CINEMA')}
              />
            </aside>
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

    </div>
  );
}
