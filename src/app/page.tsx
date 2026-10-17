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
  Undo2,
  Redo2,
  Info,
} from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { CinemaCanvas } from '@/components/CinemaCanvas';
import { Controls, TabKey } from '@/components/Controls';
import { loadImage } from '@/utils/image';
import { SurpriseModal } from '@/components/SurpriseModal';
import { applyProposalSettings } from '@/lib/surprise';
import { EditorState, Preset, TemplateId, CreativeProposal } from '@/types/editor';
import { exportCanvasAsImage, renderCinematicFrame } from '@/lib/canvas';
import { computeFrameLayout, getPanBounds, clampPosition } from '@/lib/geometry';
import {
  CINEMATIC_PRESETS,
  applyPresetIntensity,
  getPresetDisplayName,
} from '@/lib/presets';
import { applyTemplate, getTemplateDisplayName } from '@/lib/templates';

const emptySubscribe = () => () => {};

// Filter out spurious hydration noise caused by third-party browser extensions (e.g. Bitdefender, Urban VPN)
// injecting 'bis_skin_checked' into Next.js's internal metadata streaming boundary before React hydrates.
if (typeof window !== 'undefined') {
  const origError = window.console.error;
  window.console.error = function (...args: unknown[]) {
    for (const arg of args) {
      if (
        typeof arg === 'string' &&
        (arg.includes('bis_skin_checked') || arg.includes('__next_metadata_boundary__'))
      ) {
        return;
      }
    }
    return origError.apply(window.console, args);
  };
}

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

  // --- Marcas de tiempo cinematográficas ---
  timestampEnabled: false,
  timestampText: 'OCT. 1998',
  timestampPreset: 'analog-date',
  timestampPosition: 'bottom-right',
  timestampSize: 20,
  timestampColor: '#F97316',
  timestampOpacity: 85,
  timestampFont: 'mono',

  // --- Créditos cinematográficos ---
  creditEnabled: false,
  creditRole: 'A FILM BY',
  creditName: 'DIRECTOR NAME',
  creditPreset: 'film-by',
  creditPosition: 'bottom-center',
  creditAlign: 'center',
  creditSize: 22,
  creditColor: '#F4EFE6',
  creditOpacity: 85,
  creditFont: 'montserrat',

  // --- Resplandor de luces ---
  glowEnabled: false,
  glowIntensity: 25,
  glowRadius: 24,
  glowTone: 'warm',

  // --- Bordes de película analógica ---
  borderEnabled: false,
  borderStyle: 'none',
  borderWidth: 4,
  borderColor: '#0A0A0C',
  borderOpacity: 100,
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
  const [exportFeedback, setExportFeedback] = useState<{
    type: 'download' | 'share' | 'canceled' | 'preview' | 'error';
    message: string;
  } | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<TabKey>('encuadre');
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // --- NUEVA IMAGEN STATE & REFS ---
  const newImageInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);

  // --- SORPRÉNDEME STATE & REFS ---
  const [isSurpriseOpen, setIsSurpriseOpen] = useState(false);
  const originalSettingsBeforePreview = useRef<EditorState | null>(null);

  // --- REAL VISIBLE VIEWPORT TRACKING FOR IOS SAFARI ---
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;
    const updateViewportHeight = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        setViewportHeight(Math.round(height));
      });
    };

    updateViewportHeight();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateViewportHeight);
      vv.addEventListener('scroll', updateViewportHeight);
    }
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (vv) {
        vv.removeEventListener('resize', updateViewportHeight);
        vv.removeEventListener('scroll', updateViewportHeight);
      }
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);

  // --- UNDO / REDO HISTORY SYSTEM ---
  const [past, setPast] = useState<EditorState[]>([]);
  const [future, setFuture] = useState<EditorState[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const isBatchingHistoryRef = useRef(false);
  const batchStartSnapshotRef = useRef<EditorState | null>(null);
  const historyDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const commitHistorySnapshot = useCallback((snapshot: EditorState) => {
    setPast((prev) => {
      const updated = [...prev, snapshot];
      if (updated.length > 25) {
        return updated.slice(updated.length - 25);
      }
      return updated;
    });
    setFuture([]);
  }, []);

  const recordHistoryChange = useCallback((isContinuous: boolean = false) => {
    const current = stateRef.current;
    if (!current.image) return;

    if (isContinuous) {
      if (!isBatchingHistoryRef.current) {
        isBatchingHistoryRef.current = true;
        batchStartSnapshotRef.current = { ...current };
      }
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
      }
      historyDebounceTimerRef.current = setTimeout(() => {
        if (batchStartSnapshotRef.current) {
          commitHistorySnapshot(batchStartSnapshotRef.current);
          batchStartSnapshotRef.current = null;
        }
        isBatchingHistoryRef.current = false;
      }, 400);
    } else {
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
        historyDebounceTimerRef.current = null;
      }
      if (isBatchingHistoryRef.current && batchStartSnapshotRef.current) {
        commitHistorySnapshot(batchStartSnapshotRef.current);
        batchStartSnapshotRef.current = null;
        isBatchingHistoryRef.current = false;
      }
      commitHistorySnapshot({ ...current });
    }
  }, [commitHistorySnapshot]);

  const handleUndo = useCallback(() => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
      isBatchingHistoryRef.current = false;
    }
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, prevPast.length - 1);

      setFuture((prevFuture) => [{ ...stateRef.current }, ...prevFuture]);
      setState({ ...previous, image: stateRef.current.image });
      return newPast;
    });
  }, []);

  const handleRedo = useCallback(() => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
      isBatchingHistoryRef.current = false;
    }
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);

      setPast((prevPast) => [...prevPast, { ...stateRef.current }]);
      setState({ ...next, image: stateRef.current.image });
      return newFuture;
    });
  }, []);

  // Global keyboard shortcuts for Undo (Ctrl+Z / Cmd+Z) and Redo (Ctrl+Y / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Transient comparison interaction handlers
  const startComparison = useCallback(() => {
    if (state.image) {
      setIsComparing(true);
    }
  }, [state.image]);

  const stopComparison = useCallback(() => {
    setIsComparing(false);
  }, []);

  // Filter out extension-injected hydration errors so the dev overlay is not falsely triggered
  useEffect(() => {
    const origError = window.console.error;
    window.console.error = function (...args: unknown[]) {
      for (const arg of args) {
        if (
          typeof arg === 'string' &&
          (arg.includes('bis_skin_checked') || arg.includes('__next_metadata_boundary__'))
        ) {
          return;
        }
      }
      return origError.apply(window.console, args);
    };
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

  const processNewImageFile = async (file: File) => {
    setImageLoadError(null);
    try {
      const img = await loadImage(file);
      setPast([]);
      setFuture([]);
      setIsComparing(false);
      setExportPreview(null);
      setShowConfirmModal(false);
      setPendingFile(null);
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
      setImageLoadError('No se pudo procesar la imagen seleccionada. Se conserva la fotografía actual.');
      setShowConfirmModal(false);
      setPendingFile(null);
    }
  };

  const handleImageLoaded = async (file: File) => {
    await processNewImageFile(file);
  };

  const handleNewImageButtonClick = () => {
    newImageInputRef.current?.click();
  };

  const handleNewImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    // Verificar si existen cambios realizados que podrían perderse
    const hasModifications =
      past.length > 0 ||
      state.preset !== 'FILM_35MM' ||
      state.text !== INITIAL_STATE.text ||
      (state.zoom ?? 1) !== 1 ||
      (state.positionX ?? 0) !== 0 ||
      (state.positionY ?? 0) !== 0 ||
      state.borderEnabled ||
      state.timestampEnabled ||
      state.creditEnabled;

    if (hasModifications) {
      setPendingFile(file);
      setShowConfirmModal(true);
    } else {
      processNewImageFile(file);
    }
  };

  const handleStateChange = useCallback((updates: Partial<EditorState>) => {
    const isContinuous = Boolean(
      updates.zoom !== undefined ||
      updates.positionX !== undefined ||
      updates.positionY !== undefined ||
      updates.contrast !== undefined ||
      updates.saturation !== undefined ||
      updates.temperature !== undefined ||
      updates.highlights !== undefined ||
      updates.shadows !== undefined ||
      updates.grain !== undefined ||
      updates.vignette !== undefined ||
      updates.exposure !== undefined ||
      updates.presetIntensity !== undefined ||
      updates.textSize !== undefined ||
      updates.textHorizontalPosition !== undefined ||
      updates.textVerticalPosition !== undefined ||
      updates.textOpacity !== undefined ||
      updates.textBackgroundOpacity !== undefined ||
      updates.textBackgroundRadius !== undefined ||
      updates.textBackgroundPaddingX !== undefined ||
      updates.textBackgroundPaddingY !== undefined ||
      updates.timestampSize !== undefined ||
      updates.timestampOpacity !== undefined ||
      updates.creditSize !== undefined ||
      updates.creditOpacity !== undefined ||
      updates.borderWidth !== undefined ||
      updates.borderOpacity !== undefined ||
      updates.glowIntensity !== undefined ||
      updates.glowRadius !== undefined
    );
    recordHistoryChange(isContinuous);

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
        updates.vignette !== undefined ||
        updates.glowEnabled !== undefined ||
        updates.glowIntensity !== undefined ||
        updates.glowRadius !== undefined ||
        updates.glowTone !== undefined
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
  }, [recordHistoryChange]);

  const handlePanChange = useCallback((positionX: number, positionY: number) => {
    recordHistoryChange(true);
    setState((prev) => ({
      ...prev,
      positionX,
      positionY,
    }));
  }, [recordHistoryChange]);

  const handleResetFraming = useCallback(() => {
    recordHistoryChange(false);
    setState((prev) => ({
      ...prev,
      zoom: 1,
      positionX: 0,
      positionY: 0,
      letterbox: false,
    }));
  }, [recordHistoryChange]);

  const handlePresetSelect = useCallback((preset: Preset) => {
    if (preset === 'CUSTOM') return;
    recordHistoryChange(false);
    setState((prev) => {
      const intensity = prev.presetIntensity ?? 100;
      const values = applyPresetIntensity(CINEMATIC_PRESETS[preset].values, intensity);
      return {
        ...prev,
        ...values,
        preset,
      };
    });
  }, [recordHistoryChange]);

  const handlePresetIntensityChange = useCallback((intensity: number) => {
    recordHistoryChange(true);
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
  }, [recordHistoryChange]);

  const handleTemplateSelect = useCallback((templateId: TemplateId) => {
    recordHistoryChange(false);
    setState((prev) => {
      const templateUpdates = applyTemplate(prev, templateId);
      return {
        ...prev,
        ...templateUpdates,
      };
    });
  }, [recordHistoryChange]);

  const handleResetText = useCallback(() => {
    recordHistoryChange(false);
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
      timestampEnabled: false,
      creditEnabled: false,
    }));
  }, [recordHistoryChange]);

  const handleResetTexture = useCallback(() => {
    recordHistoryChange(false);
    setState((prev) => ({
      ...prev,
      grain: 0,
      vignette: 0,
      glowEnabled: false,
      glowIntensity: 25,
      glowRadius: 24,
      glowTone: 'warm',
      borderEnabled: false,
      borderStyle: 'none',
    }));
  }, [recordHistoryChange]);

  // --- SORPRÉNDEME LOGIC ---
  const handleOpenSurpriseMe = useCallback(() => {
    if (!state.image) return;
    originalSettingsBeforePreview.current = { ...state };
    setIsSurpriseOpen(true);
  }, [state]);

  const handlePreviewProposal = useCallback((proposal: CreativeProposal) => {
    setState((prev) => applyProposalSettings(prev, proposal));
  }, []);

  const handleRevertPreview = useCallback(() => {
    if (originalSettingsBeforePreview.current) {
      setState(originalSettingsBeforePreview.current);
    }
  }, []);

  const handleApplyProposal = useCallback((proposal: CreativeProposal) => {
    recordHistoryChange(false);
    const base = originalSettingsBeforePreview.current ?? state;
    setState(applyProposalSettings(base, proposal));
    originalSettingsBeforePreview.current = null;
    setIsSurpriseOpen(false);
  }, [recordHistoryChange, state]);

  const handleCloseSurpriseModal = useCallback(() => {
    handleRevertPreview();
    originalSettingsBeforePreview.current = null;
    setIsSurpriseOpen(false);
  }, [handleRevertPreview]);

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
    setExportFeedback(null);
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
        setExportFeedback({
          type: 'preview',
          message: 'Vista previa abierta: mantén pulsada la imagen para guardar en Fotos.',
        });
        setTimeout(() => setExportFeedback(null), 4500);
      } else if (result.method === 'share') {
        if (result.canceled) {
          // User closed or canceled the native share sheet
          setExportFeedback({
            type: 'canceled',
            message: 'Acción de compartir cancelada.',
          });
          setTimeout(() => setExportFeedback(null), 2500);
        } else {
          // Native share sheet was opened
          setExportSuccess(true);
          setExportFeedback({
            type: 'share',
            message: 'Hoja de compartir abierta: confirma guardar en Fotos o enviar.',
          });
          setTimeout(() => {
            setExportSuccess(false);
            setExportFeedback(null);
          }, 3500);
        }
      } else if (result.method === 'download') {
        // Direct download completed
        setExportSuccess(true);
        setExportFeedback({
          type: 'download',
          message: 'Fotografía cinematográfica descargada con éxito.',
        });
        setTimeout(() => {
          setExportSuccess(false);
          setExportFeedback(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Export error:', error);
      const msg = error instanceof Error
        ? error.message
        : 'No se pudo exportar la fotografía. Por favor inténtalo de nuevo.';
      setExportFeedback({ type: 'error', message: msg });
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
        setExportFeedback({
          type: 'share',
          message: 'Hoja de compartir abierta: confirma guardar en Fotos o enviar.',
        });
        setTimeout(() => setExportFeedback(null), 3500);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setExportFeedback({
            type: 'canceled',
            message: 'Acción de compartir cancelada.',
          });
          setTimeout(() => setExportFeedback(null), 2500);
          return;
        }
        setExportFeedback({ type: 'error', message: 'No se pudo abrir la hoja de compartir del sistema.' });
      }
    }
  }, [exportPreview]);

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement) => {
    canvasRef.current = canvas;
  }, []);

  const handleConfirmNewImage = () => {
    if (pendingFile) {
      processNewImageFile(pendingFile);
    } else {
      newImageInputRef.current?.click();
      setShowConfirmModal(false);
    }
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

  const containerHeightStyle = viewportHeight
    ? { height: `${viewportHeight}px`, maxHeight: `${viewportHeight}px` }
    : { height: '100dvh' };

  if (!isMounted) {
    return (
      <div 
        style={containerHeightStyle}
        className="w-full bg-[#0A0A0B] text-[#EAE8E2] flex flex-col font-sans selection:bg-[#2A2A32] overflow-hidden overscroll-none"
        suppressHydrationWarning
      />
    );
  }

  return (
    <div 
      style={containerHeightStyle}
      className="w-full bg-[#0A0A0B] text-[#EAE8E2] flex flex-col font-sans selection:bg-[#2A2A32] overflow-hidden overscroll-none"
      suppressHydrationWarning
    >
      
      {/* ============================================================== */}
      {/* ZONE 1: EDITORIAL COMPACT HEADER                               */}
      {/* ============================================================== */}
      <header className="h-12 sm:h-14 lg:h-16 shrink-0 border-b border-[#1F1F24] bg-[#0E0E10] px-3 sm:px-6 lg:px-8 flex items-center justify-between z-20">
        
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
              {/* Acciones Deshacer y Rehacer */}
              <div className="flex items-center gap-0.5 border-r border-[#232328] pr-1.5 sm:pr-2">
                <button
                  type="button"
                  id="btn-undo"
                  onClick={handleUndo}
                  disabled={past.length === 0}
                  className="h-8 w-8 rounded flex items-center justify-center text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D] disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-[#9E9C96] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Deshacer (Ctrl+Z)"
                  aria-label="Deshacer último cambio"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  id="btn-redo"
                  onClick={handleRedo}
                  disabled={future.length === 0}
                  className="h-8 w-8 rounded flex items-center justify-center text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D] disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-[#9E9C96] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Rehacer (Ctrl+Y)"
                  aria-label="Rehacer último cambio"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

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

              {/* Botón «Sorpréndeme» */}
              <button
                type="button"
                id="btn-sorprendeme"
                onClick={handleOpenSurpriseMe}
                className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-medium bg-[#1A1813] hover:bg-[#25221B] text-[#D8C7A5] border border-[#3E382A] hover:border-[#D8C7A5]/60 hover:text-white rounded-md transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Proponer 3 visiones creativas combinando estilos y resplandor"
                aria-label="Sorpréndeme con 3 propuestas cinematográficas"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D8C7A5]" />
                <span className="tracking-wide">Sorpréndeme</span>
              </button>

              {/* Nueva Imagen */}
              <button
                type="button"
                id="btn-nueva-imagen"
                onClick={handleNewImageButtonClick}
                className="h-8 sm:h-9 px-2 sm:px-3 text-xs font-medium text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D] border border-[#232328] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Cargar una nueva fotografía"
                aria-label="Cargar nueva fotografía"
              >
                <Plus className="w-3.5 h-3.5 text-[#D8C7A5]" />
                <span className="text-[11px] sm:text-xs">Nueva imagen</span>
              </button>

              <input
                ref={newImageInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp,image/avif,image/*"
                onChange={handleNewImageInputChange}
              />

              {/* Exportar JPG Principal */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="h-8 sm:h-9 px-3 sm:px-4 bg-[#EAE8E2] hover:bg-white text-[#0A0A0B] text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm tracking-wide disabled:opacity-50"
              >
                {exportSuccess ? (
                  exportFeedback?.type === 'share' ? (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-[#0A0A0B]" />
                      <span className="hidden xs:inline">Compartir listo</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                      <span className="hidden xs:inline">¡Descargado!</span>
                    </>
                  )
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
                onResetTexture={handleResetTexture}
                onResetText={handleResetText}
                onResetCurrentSection={handleCurrentCategoryReset}
              />
            </aside>

            {/* ZONE 3B: MOBILE EDITING SECTION */}
            <section 
              aria-label="Zona de edición móvil"
              className="lg:hidden shrink-0 border-t border-[#232328] bg-[#0E0E10] flex flex-col z-30 transition-all duration-300 ease-in-out"
            >
              {/* CATEGORY NAVIGATION BAR (INTEGRATED AT TOP OF EDITING SECTION) */}
              <nav
                role="tablist"
                aria-label="Categorías de edición cinematográfica"
                className="shrink-0 border-b border-[#232328] bg-[#121215] select-none"
                style={{
                  paddingBottom: !isMobilePanelOpen ? 'max(env(safe-area-inset-bottom, 0px), 8px)' : '0px',
                }}
              >
                <div className="h-12 flex items-center justify-between px-1.5 sm:px-2">
                  <div className="flex-1 grid grid-cols-4 h-full">
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
                          className={`h-full flex flex-col items-center justify-center py-1 relative transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D8C7A5] ${
                            isActive
                              ? 'text-[#EAE8E2] bg-[#16161A]'
                              : 'text-[#8E8C86] hover:text-[#C5C3BD]'
                          }`}
                        >
                          <div className="relative">
                            <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-[#D8C7A5]' : 'text-[#706E69]'}`} />
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
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMobilePanelOpen((prev) => !prev)}
                    className="h-8 px-2 ml-1 rounded flex items-center gap-1 text-[11px] font-medium text-[#9E9C96] hover:text-[#EAE8E2] bg-[#18181D] border border-[#26262E] transition-colors shrink-0 cursor-pointer"
                    title={isMobilePanelOpen ? "Ocultar panel de controles" : "Abrir panel de controles"}
                    aria-label={isMobilePanelOpen ? "Ocultar panel" : "Abrir panel"}
                  >
                    {isMobilePanelOpen ? (
                      <>
                        <ChevronDown className="w-3.5 h-3.5 text-[#D8C7A5]" />
                        <span className="text-[10px]">Ocultar</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-3.5 h-3.5 text-[#D8C7A5]" />
                        <span className="text-[10px]">Editar</span>
                      </>
                    )}
                  </button>
                </div>
              </nav>

              {/* EXPANDABLE CONTROLS DRAWER (DIRECTLY BELOW CATEGORY NAVIGATION) */}
              {isMobilePanelOpen && (
                <div 
                  className="h-[42dvh] max-h-[46dvh] flex flex-col overflow-hidden bg-[#0E0E10]"
                  style={{
                    height: viewportHeight ? `${Math.min(Math.round(viewportHeight * 0.44), 360)}px` : undefined,
                  }}
                >
                  {/* Category Sub-Header */}
                  <div className="h-9 px-3 sm:px-4 border-b border-[#232328] bg-[#121215] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold tracking-wide text-[#EAE8E2]">
                        {CATEGORIES.find((c) => c.id === activeCategory)?.label}
                      </span>
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
                        className="text-[11px] text-[#9E9C96] hover:text-[#EAE8E2] px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Restablecer ajustes de esta sección"
                      >
                        <RotateCcw className="w-3 h-3 text-[#D8C7A5]" />
                        <span>Restablecer</span>
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
                      onResetTexture={handleResetTexture}
                      onResetText={handleResetText}
                      onResetCurrentSection={handleCurrentCategoryReset}
                      hideTabsHeader={true}
                      hideFooterActions={true}
                    />
                  </div>
                </div>
              )}
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
                    {pendingFile ? '¿Reemplazar la fotografía actual?' : '¿Cargar una nueva fotografía?'}
                  </h3>
                  <p className="text-xs text-[#9E9C96] mt-0.5">
                    {pendingFile 
                      ? `Se cargará «${pendingFile.name}» y se restablecerán los ajustes de encuadre, color y texto.`
                      : 'Se descartarán los ajustes de encuadre, color y texto actuales.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingFile(null);
                }}
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
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingFile(null);
                }}
                className="px-4 py-2 text-xs font-medium text-[#9E9C96] hover:text-[#EAE8E2] rounded-md transition-colors cursor-pointer"
              >
                Continuar editando
              </button>
              <button
                type="button"
                id="btn-confirm-new-image"
                onClick={handleConfirmNewImage}
                className="px-4 py-2 bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-semibold rounded-md border border-amber-500/40 transition-colors cursor-pointer"
              >
                {pendingFile ? 'Cargar nueva imagen' : 'Nueva fotografía'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICACIÓN DE ERROR DE CARGA DE IMAGEN */}
      {imageLoadError && (
        <div 
          role="alert"
          className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#18181D] border border-rose-500/30 rounded-lg p-3.5 shadow-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-[#EAE8E2]">
            <p className="font-semibold text-rose-300">Error al cargar la imagen</p>
            <p className="text-[#9E9C96] mt-0.5">{imageLoadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setImageLoadError(null)}
            className="text-[#686662] hover:text-[#EAE8E2] p-0.5"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
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
      {/* NOTIFICACIÓN TOAST DE ESTADO DE EXPORTACIÓN Y MENSAJES          */}
      {/* ============================================================== */}
      {exportFeedback && (
        <div 
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 max-w-sm ${
            exportFeedback.type === 'error'
              ? 'bg-[#1C1414] border border-rose-700/60 text-rose-200'
              : exportFeedback.type === 'download'
              ? 'bg-[#101814] border border-emerald-700/60 text-emerald-200'
              : exportFeedback.type === 'share'
              ? 'bg-[#16161C] border border-[#D8C7A5]/60 text-[#EAE8E2]'
              : exportFeedback.type === 'canceled'
              ? 'bg-[#141417] border border-[#2B2B32] text-[#A8A6A0]'
              : 'bg-[#121217] border border-[#2B2B36] text-[#D8C7A5]'
          }`}
        >
          {exportFeedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
          {exportFeedback.type === 'download' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          {exportFeedback.type === 'share' && <Share2 className="w-4 h-4 text-[#D8C7A5] shrink-0" />}
          {exportFeedback.type === 'canceled' && <Info className="w-4 h-4 text-[#8E8C86] shrink-0" />}
          {exportFeedback.type === 'preview' && <Eye className="w-4 h-4 text-[#D8C7A5] shrink-0" />}
          
          <span className="flex-1 leading-relaxed">{exportFeedback.message}</span>
          <button
            type="button"
            onClick={() => setExportFeedback(null)}
            className="text-inherit opacity-60 hover:opacity-100 p-0.5 cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SORPRÉNDEME (PROPUESTAS CREATIVAS CINEMATOGRÁFICAS)     */}
      {/* ============================================================== */}
      {isSurpriseOpen && (
        <SurpriseModal
          isOpen={isSurpriseOpen}
          onClose={handleCloseSurpriseModal}
          currentState={originalSettingsBeforePreview.current ?? state}
          onApplyProposal={handleApplyProposal}
          onPreviewProposal={handlePreviewProposal}
          onRevertPreview={handleRevertPreview}
        />
      )}

    </div>
  );
}
