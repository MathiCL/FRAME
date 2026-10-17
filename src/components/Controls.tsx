'use client';

import React, { useState } from 'react';
import { 
  Crop, 
  Palette, 
  Sparkles, 
  Type, 
  RotateCcw, 
  Check, 
  Move,
  Film,
  Clock
} from 'lucide-react';
import { 
  EditorState, 
  Preset, 
  TemplateId,
  FitMode, 
  TextType, 
  TextFont, 
  TextAlign, 
  AspectFormat,
  BorderStyle,
  TimestampPosition,
  CreditPosition
} from '@/types/editor';
import { ASPECT_FORMATS, computeFrameLayout, getPanBounds } from '@/lib/geometry';
import { 
  FONT_STACKS, 
  CINEMATIC_TEXT_COLORS, 
  CINEMATIC_BG_COLORS,
  TIMESTAMP_PRESETS,
  CREDIT_PRESETS
} from '@/lib/typography';
import { BORDER_OPTIONS } from '@/lib/borders';
import { PRESET_GALLERY_LIST, getPresetDisplayName } from '@/lib/presets';
import { TEMPLATES_GALLERY_LIST, getTemplateDisplayName, applyTemplate } from '@/lib/templates';

export interface ControlsProps {
  state: EditorState;
  onChange: (updates: Partial<EditorState>) => void;
  onDownload: () => void;
  onPresetSelect: (preset: Preset) => void;
  onPresetIntensityChange?: (intensity: number) => void;
  onTemplateSelect?: (templateId: TemplateId) => void;
  onReset: () => void;
  onResetFraming?: () => void;
  onResetColor?: () => void;
  onResetTexture?: () => void;
  onResetText?: () => void;
  onResetCurrentSection?: () => void;
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
  hideTabsHeader?: boolean;
  hideFooterActions?: boolean;
}

export type TabKey = 'encuadre' | 'color' | 'textura' | 'texto';

function TemplateThumbnail({ id }: { id: TemplateId }) {
  switch (id) {
    case 'THE_QUOTE':
      return (
        <svg className="w-full h-full p-1.5" viewBox="0 0 100 40" fill="none">
          <line x1="18" y1="13" x2="82" y2="13" stroke="#F4EFE6" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="26" y1="20" x2="74" y2="20" stroke="#F4EFE6" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="38" y1="27" x2="62" y2="27" stroke="#D8C7A5" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="3 2" />
        </svg>
      );
    case 'THE_SUBTITLE':
      return (
        <svg className="w-full h-full p-1.5" viewBox="0 0 100 40" fill="none">
          <rect x="14" y="22" width="72" height="12" rx="3" fill="#1C1C22" stroke="#383844" strokeWidth="0.8" />
          <line x1="22" y1="28" x2="78" y2="28" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'THE_OPENING':
      return (
        <svg className="w-full h-full p-1.5" viewBox="0 0 100 40" fill="none">
          <line x1="14" y1="16" x2="86" y2="16" stroke="#F4EFE6" strokeWidth="3.6" strokeLinecap="round" />
          <line x1="32" y1="25" x2="68" y2="25" stroke="#9E9C96" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'THE_DIARY':
      return (
        <svg className="w-full h-full p-1.5" viewBox="0 0 100 40" fill="none">
          <line x1="10" y1="18" x2="48" y2="18" stroke="#E2D3B8" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="10" y1="24" x2="64" y2="24" stroke="#E2D3B8" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="10" y1="30" x2="36" y2="30" stroke="#85837E" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case 'THE_MINIMAL':
      return (
        <svg className="w-full h-full p-1.5" viewBox="0 0 100 40" fill="none">
          <line x1="38" y1="32" x2="62" y2="32" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeOpacity="0.85" />
        </svg>
      );
    default:
      return null;
  }
}

function BorderThumbnail({ id }: { id: BorderStyle }) {
  switch (id) {
    case 'none':
      return (
        <svg className="w-full h-full p-2" viewBox="0 0 100 48" fill="none">
          <rect x="4" y="4" width="92" height="40" rx="3" stroke="#52504C" strokeWidth="1.2" strokeDasharray="3 3" />
          <line x1="30" y1="24" x2="70" y2="24" stroke="#8E8C86" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'negative-35mm':
      return (
        <svg className="w-full h-full p-1" viewBox="0 0 100 48" fill="none">
          <rect x="4" y="4" width="92" height="40" fill="#0C0C0E" rx="2" stroke="#2B2B34" strokeWidth="1" />
          {/* Top sprockets */}
          <rect x="8" y="7" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          <rect x="23" y="7" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          <rect x="38" y="7" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          <rect x="53" y="7" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          <rect x="68" y="7" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          <rect x="83" y="7" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          {/* Bottom sprockets */}
          <rect x="8" y="36" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          <rect x="23" y="36" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          <rect x="38" y="36" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          <rect x="53" y="36" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          <rect x="68" y="36" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          <rect x="83" y="36" width="8" height="5" rx="1" fill="#000000" stroke="#3E3E48" strokeWidth="0.6" />
          {/* Photo frame */}
          <rect x="10" y="15" width="80" height="18" fill="#1C1C22" />
          <text x="50" y="27" fill="#F59E0B" fontSize="6" fontFamily="monospace" textAnchor="middle" fontWeight="bold">35MM</text>
        </svg>
      );
    case 'film-gate':
      return (
        <svg className="w-full h-full p-1.5" viewBox="0 0 100 48" fill="none">
          <rect x="4" y="4" width="92" height="40" fill="#070709" stroke="#222228" strokeWidth="1" />
          <rect x="12" y="9" width="76" height="30" rx="5" fill="#18181D" stroke="#3A3A44" strokeWidth="1" />
        </svg>
      );
    case 'vintage-print':
      return (
        <svg className="w-full h-full p-1.5" viewBox="0 0 100 48" fill="none">
          <rect x="6" y="4" width="88" height="40" fill="#F4EFE6" stroke="#DDD6C9" strokeWidth="0.8" rx="1" />
          <rect x="12" y="8" width="76" height="25" fill="#141418" />
        </svg>
      );
    case 'minimal-wire':
      return (
        <svg className="w-full h-full p-2" viewBox="0 0 100 48" fill="none">
          <rect x="8" y="6" width="84" height="36" stroke="#EAE8E2" strokeWidth="1" />
          {/* Corner tick marks */}
          <line x1="5" y1="6" x2="11" y2="6" stroke="#D8C7A5" strokeWidth="1" />
          <line x1="8" y1="3" x2="8" y2="9" stroke="#D8C7A5" strokeWidth="1" />
          <line x1="89" y1="6" x2="95" y2="6" stroke="#D8C7A5" strokeWidth="1" />
          <line x1="92" y1="3" x2="92" y2="9" stroke="#D8C7A5" strokeWidth="1" />
          <line x1="5" y1="42" x2="11" y2="42" stroke="#D8C7A5" strokeWidth="1" />
          <line x1="8" y1="39" x2="8" y2="45" stroke="#D8C7A5" strokeWidth="1" />
          <line x1="89" y1="42" x2="95" y2="42" stroke="#D8C7A5" strokeWidth="1" />
          <line x1="92" y1="39" x2="92" y2="45" stroke="#D8C7A5" strokeWidth="1" />
        </svg>
      );
  }
}

const FONT_OPTIONS: Array<{ id: TextFont; label: string; subtitle: string }> = [
  { id: 'type-machine', label: 'Máquina Clásica', subtitle: 'Tinta irregular vintage' },
  { id: 'elegant-typewriter', label: 'Elegant Typewriter', subtitle: 'Guion cinematográfico' },
  { id: 'montserrat', label: 'Editorial Sans', subtitle: 'Sans geométrica' },
  { id: 'serif', label: 'Serif Editorial', subtitle: 'Clásica literaria' },
  { id: 'sans', label: 'Sans Cine', subtitle: 'Subtítulo moderno' },
  { id: 'mono', label: 'Monospace', subtitle: 'Teletexto técnico' },
];

export function Controls({
  state,
  onChange,
  onDownload,
  onPresetSelect,
  onPresetIntensityChange,
  onTemplateSelect,
  onReset,
  onResetFraming,
  onResetColor,
  onResetTexture,
  onResetText,
  onResetCurrentSection,
  activeTab: activeTabProp,
  onTabChange: onTabChangeProp,
  hideTabsHeader = false,
  hideFooterActions = false,
}: ControlsProps) {
  const [internalTab, setInternalTab] = useState<TabKey>('encuadre');
  const [textSubTab, setTextSubTab] = useState<'quote' | 'timestamp' | 'credits'>('quote');
  const activeTab = activeTabProp ?? internalTab;
  const setActiveTab = onTabChangeProp ?? setInternalTab;

  const handleResetCurrentSection = () => {
    if (onResetCurrentSection) {
      onResetCurrentSection();
      return;
    }
    switch (activeTab) {
      case 'encuadre':
        onResetFraming?.();
        break;
      case 'color':
        onResetColor?.();
        break;
      case 'textura':
        onResetTexture?.();
        break;
      case 'texto':
        onResetText?.();
        break;
    }
  };

  // Compute boundaries for interactive pan and zoom sliders
  const layout = state.image ? computeFrameLayout(state.format, state.image, state.letterbox) : null;
  const bounds = (state.image && layout)
    ? getPanBounds(state.image, layout.imageArea, state.fitMode, state.zoom ?? 1)
    : { minX: -50, maxX: 50, minY: -50, maxY: 50, canPanX: true, canPanY: true };

  const isFill = state.fitMode === 'fill';
  const zoomMin = isFill ? 1.0 : 0.5;
  const zoomMax = isFill ? 3.0 : 2.5;

  const isQuote = state.textType === 'quote';

  const TABS: { id: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'encuadre', label: 'Encuadre', icon: Crop },
    { id: 'color', label: 'Color', icon: Palette },
    { id: 'textura', label: 'Textura', icon: Sparkles },
    { id: 'texto', label: 'Texto', icon: Type },
  ];

  return (
    <div className="w-full flex flex-col h-full bg-[#0E0E10] text-[#EAE8E2] select-none">
      
      {/* 4 MODULAR TABS HEADER (Hidden on mobile when using bottom navigation) */}
      {!hideTabsHeader && (
        <div 
          role="tablist" 
          aria-label="Pestañas de edición cinematográfica"
          className="grid grid-cols-4 border-b border-[#232328] bg-[#121215] shrink-0"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 px-2 text-xs font-medium tracking-wide transition-all relative cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D8C7A5] ${
                  isActive
                    ? 'text-[#EAE8E2] bg-[#17171B]'
                    : 'text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#151518]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 transition-colors ${isActive ? 'text-[#D8C7A5]' : 'text-[#686662]'}`} />
                <span className="text-[11px] sm:text-xs">{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D8C7A5]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* TAB CONTENT AREA */}
      <div 
        className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 sm:py-6 overscroll-contain"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
      >
        
        {/* ============================================================== */}
        {/* TAB 1: ENCUADRE                                                */}
        {/* ============================================================== */}
        {activeTab === 'encuadre' && (
          <div 
            role="tabpanel" 
            id="panel-encuadre" 
            aria-labelledby="tab-encuadre" 
            className="flex flex-col gap-6"
          >
            {/* Aspect Format */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label id="format-heading" className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96]">
                  Formato Cinematográfico
                </label>
                <span className="text-[10px] text-[#686662] font-mono">Relación de aspecto</span>
              </div>
              <div 
                role="radiogroup" 
                aria-labelledby="format-heading" 
                className="flex overflow-x-auto gap-2 pb-1.5 snap-x snap-mandatory no-scrollbar lg:grid lg:grid-cols-3 lg:gap-2 lg:overflow-visible"
              >
                {ASPECT_FORMATS.map((fmt) => {
                  const isSelected = state.format === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onChange({ format: fmt.id as AspectFormat })}
                      className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-md border text-center transition-all cursor-pointer shrink-0 min-w-[88px] snap-start lg:shrink lg:min-w-0 ${
                        isSelected
                          ? 'bg-[#EAE8E2] text-[#0A0A0B] border-[#EAE8E2] font-semibold shadow-sm'
                          : 'bg-[#141417] text-[#9E9C96] border-[#232328] hover:text-[#EAE8E2] hover:border-[#35353C]'
                      }`}
                    >
                      <span className="text-[11px] tracking-wide">{fmt.label}</span>
                      <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-[#3E3C36]' : 'text-[#686662]'}`}>
                        {fmt.id === 'original' ? 'Nativo' : fmt.id === '2.39:1' ? 'Scope' : fmt.id === '16:9' ? 'Wide' : fmt.id === '4:5' ? 'Editorial' : fmt.id === '1:1' ? 'Cuadrado' : 'Vertical'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fit vs Fill Mode */}
            <div className="space-y-3 pt-3 border-t border-[#1F1F24]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96]">
                  Modo de Encuadre
                </span>
                <span className="text-[10px] text-[#686662]">
                  {state.fitMode === 'fit' ? 'Fotografía completa' : 'Recorte al lienzo'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-[#121215] p-1 rounded-lg border border-[#232328]">
                <button
                  type="button"
                  onClick={() => {
                    const newZoom = (state.zoom ?? 1) < 0.5 ? 1 : (state.zoom ?? 1);
                    onChange({ fitMode: 'fit' as FitMode, zoom: newZoom });
                  }}
                  className={`py-2 px-3 text-xs font-medium rounded-md transition-all text-center cursor-pointer ${
                    state.fitMode === 'fit'
                      ? 'bg-[#EAE8E2] text-[#0A0A0B] font-semibold shadow-sm'
                      : 'text-[#9E9C96] hover:text-[#EAE8E2]'
                  }`}
                >
                  Ajustar (Fit)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const newZoom = Math.max(1.0, state.zoom ?? 1);
                    onChange({ fitMode: 'fill' as FitMode, zoom: newZoom });
                  }}
                  className={`py-2 px-3 text-xs font-medium rounded-md transition-all text-center cursor-pointer ${
                    state.fitMode === 'fill'
                      ? 'bg-[#EAE8E2] text-[#0A0A0B] font-semibold shadow-sm'
                      : 'text-[#9E9C96] hover:text-[#EAE8E2]'
                  }`}
                >
                  Rellenar (Fill)
                </button>
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="space-y-2 pt-3 border-t border-[#1F1F24]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9E9C96] font-medium">Zoom de imagen</span>
                <span className="font-mono text-[#D8C7A5]">{(state.zoom ?? 1).toFixed(2)}×</span>
              </div>
              <input
                type="range"
                aria-label="Zoom de imagen"
                min={zoomMin}
                max={zoomMax}
                step="0.01"
                value={state.zoom ?? 1}
                onChange={(e) => onChange({ zoom: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                <span>{zoomMin.toFixed(1)}×</span>
                <span>{zoomMax.toFixed(1)}×</span>
              </div>
            </div>

            {/* Position Horizontal & Vertical */}
            <div className="space-y-4 pt-3 border-t border-[#1F1F24]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96]">
                  Desplazamiento
                </span>
                <span className="text-[10px] text-[#686662] flex items-center gap-1">
                  <Move className="w-3 h-3" /> Arrastra en el lienzo
                </span>
              </div>

              {/* Position X */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9C96]">Posición horizontal</span>
                  <span className="font-mono text-[#EAE8E2]">
                    {(state.positionX ?? 0) > 0 ? `+${(state.positionX ?? 0).toFixed(1)}` : (state.positionX ?? 0).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Posición horizontal"
                  min={bounds.minX}
                  max={bounds.maxX}
                  step="0.1"
                  disabled={!bounds.canPanX && isFill}
                  value={state.positionX ?? 0}
                  onChange={(e) => onChange({ positionX: Number(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Position Y */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9C96]">Posición vertical</span>
                  <span className="font-mono text-[#EAE8E2]">
                    {(state.positionY ?? 0) > 0 ? `+${(state.positionY ?? 0).toFixed(1)}` : (state.positionY ?? 0).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Posición vertical"
                  min={bounds.minY}
                  max={bounds.maxY}
                  step="0.1"
                  disabled={!bounds.canPanY && isFill}
                  value={state.positionY ?? 0}
                  onChange={(e) => onChange({ positionY: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>

            {/* Letterbox Cinema Bars */}
            <div className="pt-3 border-t border-[#1F1F24]">
              <button
                type="button"
                onClick={() => onChange({ letterbox: !state.letterbox })}
                className={`w-full py-2.5 px-3 rounded-lg border flex items-center justify-between text-xs transition-all cursor-pointer ${
                  state.letterbox
                    ? 'bg-[#18181D] border-[#D8C7A5]/60 text-[#EAE8E2]'
                    : 'bg-[#121215] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2] hover:border-[#35353C]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#D8C7A5]" />
                  <div className="text-left">
                    <p className="font-medium text-[#EAE8E2]">Bandas cinematográficas</p>
                    <p className="text-[10px] text-[#686662]">Barras negras decorativas tipo CinemaScope</p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  state.letterbox ? 'bg-[#D8C7A5] border-[#D8C7A5] text-[#0A0A0B]' : 'border-[#383842] bg-transparent'
                }`}>
                  {state.letterbox && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>

            {/* Reset Framing Button */}
            {onResetFraming && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onResetFraming}
                  className="w-full py-2 px-3 rounded-md border border-[#232328] bg-[#121215] text-[#9E9C96] hover:text-[#EAE8E2] hover:border-[#35353C] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restablecer encuadre
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: COLOR                                                   */}
        {/* ============================================================== */}
        {activeTab === 'color' && (
          <div 
            role="tabpanel" 
            id="panel-color" 
            aria-labelledby="tab-color" 
            className="flex flex-col gap-6"
          >
            {/* Cinematic Presets Gallery */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96] block">
                    Estilos Cinematográficos
                  </span>
                  <span className="text-[10px] text-[#686662]">
                    Gradación de color y atmósfera analógica
                  </span>
                </div>
                {state.preset === 'CUSTOM' ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#202026] text-[#D8C7A5] font-mono border border-[#2E2E38]">
                    Personalizado
                  </span>
                ) : (
                  <span className="text-[10px] text-[#D8C7A5] font-mono">
                    {getPresetDisplayName(state.preset)}
                  </span>
                )}
              </div>

              {/* Gallery Grid / Carousel on mobile */}
              <div 
                role="radiogroup" 
                aria-label="Seleccionar estilo cinematográfico"
                className="flex overflow-x-auto gap-2.5 pb-2 pt-1 -mx-1 px-1 snap-x snap-mandatory no-scrollbar lg:grid lg:grid-cols-2 lg:overflow-visible lg:p-0 lg:m-0"
              >
                {PRESET_GALLERY_LIST.map((presetItem) => {
                  const isSelected = state.preset === presetItem.id;
                  return (
                    <button
                      key={presetItem.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onPresetSelect(presetItem.id)}
                      className={`group relative flex flex-col p-2.5 rounded-lg border text-left transition-all cursor-pointer shrink-0 w-36 sm:w-40 snap-start lg:w-auto lg:shrink ${
                        isSelected
                          ? 'bg-[#18181D] border-[#D8C7A5] shadow-[0_0_12px_rgba(216,199,165,0.12)] ring-1 ring-[#D8C7A5]/60'
                          : 'bg-[#121215] border-[#232328] hover:border-[#383842] hover:bg-[#151518]'
                      }`}
                    >
                      {/* Swatch gradient header */}
                      <div 
                        className="w-full h-8 rounded mb-1.5 flex items-center justify-end px-1.5 shadow-inner relative overflow-hidden"
                        style={{ background: presetItem.gradient }}
                      >
                        {isSelected && (
                          <div className="w-3.5 h-3.5 rounded-full bg-[#0A0A0B]/80 text-[#D8C7A5] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <p className={`text-xs font-semibold tracking-wide ${isSelected ? 'text-[#EAE8E2]' : 'text-[#CCCCCC] group-hover:text-[#EAE8E2]'}`}>
                          {presetItem.name}
                        </p>
                        <p className="text-[10px] text-[#85837E] leading-tight line-clamp-1">
                          {presetItem.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Global Intensity Slider */}
            <div className="space-y-2 pt-3 border-t border-[#1F1F24]">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#9E9C96] font-medium block">Intensidad del estilo</span>
                  <span className="text-[10px] text-[#686662]">
                    {state.preset === 'ORIGINAL'
                      ? 'Sin procesado activo'
                      : state.preset === 'CUSTOM'
                      ? 'Ajustes manuales en curso'
                      : `Gradúa el efecto de ${getPresetDisplayName(state.preset)}`}
                  </span>
                </div>
                <span className="font-mono text-[#D8C7A5] text-xs">
                  {state.preset === 'ORIGINAL' ? '0%' : `${state.presetIntensity ?? 100}%`}
                </span>
              </div>
              <input
                type="range"
                aria-label="Intensidad del estilo cinematográfico"
                min="0"
                max="100"
                step="1"
                disabled={state.preset === 'ORIGINAL'}
                value={state.preset === 'ORIGINAL' ? 0 : (state.presetIntensity ?? 100)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (onPresetIntensityChange) {
                    onPresetIntensityChange(val);
                  } else {
                    onChange({ presetIntensity: val });
                  }
                }}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                <span>0% Neutro</span>
                <span>50% Sutil</span>
                <span>100% Pleno</span>
              </div>
            </div>

            {/* Adjustment Sliders */}
            <div className="space-y-5 pt-3 border-t border-[#1F1F24]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96] block">
                Revelado de Laboratorio
              </span>

              {/* Exposure */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9C96]">Exposición</span>
                  <span className="font-mono text-[#D8C7A5]">
                    {(state.exposure ?? 0) > 0 ? `+${state.exposure}` : state.exposure ?? 0}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Exposición"
                  min="-30"
                  max="30"
                  value={state.exposure ?? 0}
                  onChange={(e) => onChange({ exposure: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                  <span>-30 Nocturna</span>
                  <span>+30 Luminosa</span>
                </div>
              </div>

              {/* Contrast */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9C96]">Contraste</span>
                  <span className="font-mono text-[#D8C7A5]">
                    {(state.contrast ?? 0) > 0 ? `+${state.contrast}` : state.contrast ?? 0}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Contraste"
                  min="-30"
                  max="30"
                  value={state.contrast ?? 0}
                  onChange={(e) => onChange({ contrast: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                  <span>-30 Suave</span>
                  <span>+30 Marcado</span>
                </div>
              </div>

              {/* Saturation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9C96]">Saturación</span>
                  <span className="font-mono text-[#D8C7A5]">
                    {(state.saturation ?? 0) > 0 ? `+${state.saturation}` : state.saturation ?? 0}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Saturación"
                  min="-100"
                  max="30"
                  value={state.saturation ?? 0}
                  onChange={(e) => onChange({ saturation: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                  <span>-100% Monocromo</span>
                  <span>+30% Vívido</span>
                </div>
              </div>

              {/* Temperature */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9C96]">Temperatura de color</span>
                  <span className="font-mono text-[#D8C7A5]">
                    {(state.temperature ?? 0) > 0 ? `+${state.temperature} Cálido` : (state.temperature ?? 0) < 0 ? `${state.temperature} Frío` : 'Neutro'}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Temperatura de color"
                  min="-30"
                  max="30"
                  value={state.temperature ?? 0}
                  onChange={(e) => onChange({ temperature: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                  <span>Frío (-30)</span>
                  <span>Cálido (+30)</span>
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9C96]">Luces altas</span>
                  <span className="font-mono text-[#D8C7A5]">
                    {(state.highlights ?? 0) > 0 ? `+${state.highlights}` : state.highlights ?? 0}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Luces altas"
                  min="-50"
                  max="20"
                  value={state.highlights ?? 0}
                  onChange={(e) => onChange({ highlights: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                  <span>-50 Recuperadas</span>
                  <span>+20 Brillantes</span>
                </div>
              </div>

              {/* Shadows */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#9E9C96]">Sombras</span>
                  <span className="font-mono text-[#D8C7A5]">
                    {(state.shadows ?? 0) > 0 ? `+${state.shadows}` : state.shadows ?? 0}
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Sombras"
                  min="-50"
                  max="30"
                  value={state.shadows ?? 0}
                  onChange={(e) => onChange({ shadows: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                  <span>-50 Profundas</span>
                  <span>+30 Aclaradas</span>
                </div>
              </div>
            </div>

            {/* Reset color to original preset */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onResetColor ?? (() => onPresetSelect('ORIGINAL'))}
                className="w-full py-2 px-3 rounded-md border border-[#232328] bg-[#121215] text-[#9E9C96] hover:text-[#EAE8E2] hover:border-[#35353C] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer a Original (sin preset)
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: TEXTURA                                                 */}
        {/* ============================================================== */}
        {activeTab === 'textura' && (
          <div 
            role="tabpanel" 
            id="panel-textura" 
            aria-labelledby="tab-textura" 
            className="flex flex-col gap-6"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96]">
                Textura y Acabado Óptico
              </span>
              <p className="text-[11px] text-[#686662] leading-relaxed">
                Simula la emulsión fotosensible y la física de las lentes cinematográficas para integrar imagen y tipografía.
              </p>
            </div>

            {/* Film Grain */}
            <div className="space-y-2 pt-3 border-t border-[#1F1F24]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9E9C96] font-medium">Grano de película analógica</span>
                <span className="font-mono text-[#D8C7A5]">{state.grain ?? 0}%</span>
              </div>
              <input
                type="range"
                aria-label="Grano de película analógica"
                min="0"
                max="100"
                value={state.grain ?? 0}
                onChange={(e) => onChange({ grain: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between items-center text-[10px] text-[#686662] font-mono">
                <span>0% Limpio</span>
                <span className="text-[#9E9C96]">
                  {(state.grain ?? 0) === 0 ? 'Sin grano' : (state.grain ?? 0) < 15 ? 'Grano sutil 35mm' : (state.grain ?? 0) < 35 ? 'Grano medio 16mm' : 'Emulsión forzada'}
                </span>
                <span>100% Forzado</span>
              </div>
            </div>

            {/* Vignette */}
            <div className="space-y-2 pt-3 border-t border-[#1F1F24]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9E9C96] font-medium">Viñeta óptica perimetral</span>
                <span className="font-mono text-[#D8C7A5]">{state.vignette ?? 0}%</span>
              </div>
              <input
                type="range"
                aria-label="Viñeta óptica perimetral"
                min="0"
                max="100"
                value={state.vignette ?? 0}
                onChange={(e) => onChange({ vignette: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between items-center text-[10px] text-[#686662] font-mono">
                <span>0% Plana</span>
                <span className="text-[#9E9C96]">
                  {(state.vignette ?? 0) === 0 ? 'Sin viñeta' : (state.vignette ?? 0) < 20 ? 'Caída de luz natural' : 'Viñeta acentuada'}
                </span>
                <span>100% Oscura</span>
              </div>
            </div>

            {/* Analog Film Borders */}
            <div className="space-y-4 pt-3 border-t border-[#1F1F24]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96] block">
                    Bordes de Película Analógica
                  </span>
                  <span className="text-[10px] text-[#686662]">
                    Marcos decorativos de tira de celuloide y copias vintage
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  id="border-toggle"
                  aria-checked={state.borderEnabled ?? false}
                  onClick={() => onChange({ 
                    borderEnabled: !(state.borderEnabled ?? false),
                    borderStyle: state.borderStyle === 'none' || !state.borderStyle ? 'negative-35mm' : state.borderStyle
                  })}
                  className={`h-7 px-3 rounded-md border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    (state.borderEnabled ?? false)
                      ? 'bg-[#18181D] border-[#D8C7A5]/70 text-[#EAE8E2]'
                      : 'bg-[#121215] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    (state.borderEnabled ?? false) ? 'bg-[#D8C7A5]' : 'bg-[#404048]'
                  }`} />
                  <span>{(state.borderEnabled ?? false) ? 'Activado' : 'Desactivado'}</span>
                </button>
              </div>

              {/* Gallery of border styles */}
              <div 
                role="radiogroup" 
                aria-label="Seleccionar estilo de marco"
                className="flex overflow-x-auto gap-2.5 pb-2 pt-1 -mx-1 px-1 snap-x snap-mandatory no-scrollbar lg:grid lg:grid-cols-2 lg:overflow-visible lg:p-0 lg:m-0"
              >
                {BORDER_OPTIONS.map((border) => {
                  const isSelected = (state.borderEnabled && state.borderStyle === border.id) || (!state.borderEnabled && border.id === 'none');
                  return (
                    <button
                      key={border.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => {
                        if (border.id === 'none') {
                          onChange({ borderEnabled: false, borderStyle: 'none' });
                        } else {
                          onChange({ borderEnabled: true, borderStyle: border.id });
                        }
                      }}
                      className={`group relative flex flex-col p-2.5 rounded-lg border text-left transition-all cursor-pointer shrink-0 w-36 sm:w-40 snap-start lg:w-auto lg:shrink ${
                        isSelected
                          ? 'bg-[#18181D] border-[#D8C7A5] shadow-[0_0_12px_rgba(216,199,165,0.12)] ring-1 ring-[#D8C7A5]/60'
                          : 'bg-[#121215] border-[#232328] hover:border-[#383842] hover:bg-[#151518]'
                      }`}
                    >
                      <div className="w-full h-11 rounded bg-[#0A0A0B] border border-[#202025] mb-1.5 flex items-center justify-center relative overflow-hidden shadow-inner">
                        <BorderThumbnail id={border.id} />
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#D8C7A5] text-[#0A0A0B] flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className={`text-xs font-semibold tracking-wide ${isSelected ? 'text-[#EAE8E2]' : 'text-[#CCCCCC] group-hover:text-[#EAE8E2]'}`}>
                          {border.label}
                        </p>
                        <p className="text-[10px] text-[#85837E] leading-tight line-clamp-1">
                          {border.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Adjustments when border is enabled */}
              {(state.borderEnabled && state.borderStyle && state.borderStyle !== 'none') && (
                <div className="space-y-4 pt-1">
                  {/* Border width slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9E9C96]">Grosor de margen</span>
                      <span className="font-mono text-[#D8C7A5]">
                        {state.borderWidth ?? 28} px
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Grosor de margen del borde"
                      min="12"
                      max="60"
                      step="1"
                      value={state.borderWidth ?? 28}
                      onChange={(e) => onChange({ borderWidth: Number(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                      <span>12 px Fino</span>
                      <span>28 px Equilibrado</span>
                      <span>60 px Amplio</span>
                    </div>
                  </div>

                  {/* Border opacity slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9E9C96]">Opacidad del marco</span>
                      <span className="font-mono text-[#D8C7A5]">
                        {state.borderOpacity ?? 100}%
                      </span>
                    </div>
                    <input
                      type="range"
                      aria-label="Opacidad del marco"
                      min="20"
                      max="100"
                      step="1"
                      value={state.borderOpacity ?? 100}
                      onChange={(e) => onChange({ borderOpacity: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  {/* Border color palette */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-[#9E9C96]">Tonalidad de marco</span>
                    <div className="flex overflow-x-auto items-center gap-2 pb-1 no-scrollbar lg:flex-wrap">
                      {[
                        { id: 'black', label: 'Negro Profundo', value: '#070709' },
                        { id: 'dark-film', label: 'Carbón Celuloide', value: '#121215' },
                        { id: 'vintage-paper', label: 'Papel Marfil', value: '#F4EFE6' },
                        { id: 'pure-white', label: 'Blanco Puro', value: '#FFFFFF' },
                        { id: 'warm-amber', label: 'Ámbar Cálido', value: '#D8C7A5' },
                      ].map((bCol) => {
                        const isCurrent = (state.borderColor || '#070709').toLowerCase() === bCol.value.toLowerCase();
                        return (
                          <button
                            key={bCol.id}
                            type="button"
                            onClick={() => onChange({ borderColor: bCol.value })}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-all cursor-pointer shrink-0 lg:shrink ${
                              isCurrent
                                ? 'bg-[#212128] border-[#D8C7A5] text-[#EAE8E2]'
                                : 'bg-[#141417] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2]'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                              style={{ backgroundColor: bCol.value }}
                            />
                            <span className="text-[11px]">{bCol.label}</span>
                          </button>
                        );
                      })}
                      {/* Custom color */}
                      <label 
                        title="Tono personalizado"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#232328] bg-[#141417] text-[#9E9C96] hover:text-[#EAE8E2] text-[11px] cursor-pointer shrink-0 lg:shrink"
                      >
                        <input
                          type="color"
                          value={state.borderColor ?? '#070709'}
                          onChange={(e) => onChange({ borderColor: e.target.value })}
                          className="w-3.5 h-3.5 rounded bg-transparent border-0 cursor-pointer p-0"
                        />
                        <span>Color libre</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Information Box */}
            <div className="p-3.5 rounded-lg bg-[#121215] border border-[#232328] space-y-1.5 mt-2">
              <p className="text-xs text-[#D8C7A5] font-medium">Renderizado en alta resolución</p>
              <p className="text-[11px] text-[#9E9C96] leading-relaxed">
                El grano se sintetiza proceduralmente durante la exportación JPG final para evitar artefactos de compresión digital.
              </p>
            </div>

            {/* Reset texture to clean default */}
            <div className="pt-2">
              <button
                type="button"
                onClick={onResetTexture ?? (() => onChange({ grain: 0, vignette: 0, borderEnabled: false, borderStyle: 'none' }))}
                className="w-full py-2 px-3 rounded-md border border-[#232328] bg-[#121215] text-[#9E9C96] hover:text-[#EAE8E2] hover:border-[#35353C] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer textura y marcos a inicial
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: TEXTO                                                   */}
        {/* ============================================================== */}
        {activeTab === 'texto' && (
          <div 
            role="tabpanel" 
            id="panel-texto" 
            aria-labelledby="tab-texto" 
            className="flex flex-col gap-6"
          >
            {/* Sub-navigation tabs: Frase / Cita | Marcas de tiempo | Créditos */}
            <div className="grid grid-cols-3 gap-1 bg-[#121215] p-1 rounded-lg border border-[#232328] shrink-0">
              <button
                type="button"
                id="subtab-quote"
                onClick={() => setTextSubTab('quote')}
                className={`py-2 px-1 sm:px-2 text-center text-xs font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  textSubTab === 'quote'
                    ? 'bg-[#EAE8E2] text-[#0A0A0B] font-semibold shadow-sm'
                    : 'text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D]'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span className="truncate">Frase / Cita</span>
              </button>
              <button
                type="button"
                id="subtab-timestamp"
                onClick={() => setTextSubTab('timestamp')}
                className={`py-2 px-1 sm:px-2 text-center text-xs font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  textSubTab === 'timestamp'
                    ? 'bg-[#EAE8E2] text-[#0A0A0B] font-semibold shadow-sm'
                    : 'text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="truncate">Detalles</span>
                {(state.timestampEnabled && state.timestampText?.trim()) ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                ) : null}
              </button>
              <button
                type="button"
                id="subtab-credits"
                onClick={() => setTextSubTab('credits')}
                className={`py-2 px-1 sm:px-2 text-center text-xs font-medium rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  textSubTab === 'credits'
                    ? 'bg-[#EAE8E2] text-[#0A0A0B] font-semibold shadow-sm'
                    : 'text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D]'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span className="truncate">Créditos</span>
                {(state.creditEnabled && (state.creditRole?.trim() || state.creditName?.trim())) ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D8C7A5]" />
                ) : null}
              </button>
            </div>

            {/* SUB-TAB 1: FRASE / CITA */}
            {textSubTab === 'quote' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Show / Hide text toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-[#1F1F24]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96]">
                    Frase Principal
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#9E9C96] hover:text-[#EAE8E2]">
                    <input
                      type="checkbox"
                      checked={state.showText ?? true}
                      onChange={(e) => onChange({ showText: e.target.checked })}
                      className="accent-[#D8C7A5] cursor-pointer"
                    />
                    <span>Mostrar en fotograma</span>
                  </label>
                </div>

                {(state.showText ?? true) ? (
                  <>
                    {/* Composition Templates Gallery */}
                    <div className="space-y-3 pb-3 border-b border-[#1F1F24]">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96] block">
                            Plantillas de Composición
                          </span>
                          <span className="text-[10px] text-[#686662]">
                            Puntos de partida tipográficos y espaciales
                          </span>
                        </div>
                        {state.template === 'CUSTOM' ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#202026] text-[#D8C7A5] font-mono border border-[#2E2E38]">
                            Personalizado
                          </span>
                        ) : state.template ? (
                          <span className="text-[10px] text-[#D8C7A5] font-mono">
                            {getTemplateDisplayName(state.template)}
                          </span>
                        ) : null}
                      </div>

                      {/* Templates Grid / Carousel on mobile */}
                      <div 
                        role="radiogroup" 
                        aria-label="Seleccionar plantilla de composición"
                        className="flex overflow-x-auto gap-2.5 pb-2 pt-1 -mx-1 px-1 snap-x snap-mandatory no-scrollbar lg:grid lg:grid-cols-2 lg:overflow-visible lg:p-0 lg:m-0"
                      >
                        {TEMPLATES_GALLERY_LIST.map((templateItem) => {
                          const isSelected = state.template === templateItem.id;
                          return (
                            <button
                              key={templateItem.id}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => {
                                if (onTemplateSelect) {
                                  onTemplateSelect(templateItem.id);
                                } else {
                                  const updates = applyTemplate(state, templateItem.id);
                                  onChange(updates);
                                }
                              }}
                              className={`group relative flex flex-col p-2.5 rounded-lg border text-left transition-all cursor-pointer shrink-0 w-36 sm:w-40 snap-start lg:w-auto lg:shrink ${
                                isSelected
                                  ? 'bg-[#18181D] border-[#D8C7A5] shadow-[0_0_12px_rgba(216,199,165,0.12)] ring-1 ring-[#D8C7A5]/60'
                                  : 'bg-[#121215] border-[#232328] hover:border-[#383842] hover:bg-[#151518]'
                              }`}
                            >
                              <div className="w-full h-10 rounded bg-[#0A0A0B] border border-[#202025] mb-1.5 flex items-center justify-center relative overflow-hidden shadow-inner">
                                <TemplateThumbnail id={templateItem.id} />
                                {isSelected && (
                                  <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#D8C7A5] text-[#0A0A0B] flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                )}
                                <span className="absolute bottom-1 left-1.5 text-[8px] font-mono tracking-wider uppercase px-1 py-0.2 rounded bg-black/70 text-[#9E9C96] border border-[#26262C]">
                                  {templateItem.badge}
                                </span>
                              </div>

                              <div className="space-y-0.5">
                                <p className={`text-xs font-semibold tracking-wide ${isSelected ? 'text-[#EAE8E2]' : 'text-[#CCCCCC] group-hover:text-[#EAE8E2]'}`}>
                                  {templateItem.name}
                                </p>
                                <p className="text-[10px] text-[#85837E] leading-tight line-clamp-1">
                                  {templateItem.subtitle}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Text Type (Quote vs Subtitle) */}
                    <div className="space-y-2">
                      <span className="text-xs text-[#9E9C96] font-medium">Modo Tipográfico</span>
                      <div className="grid grid-cols-2 gap-2 bg-[#121215] p-1 rounded-lg border border-[#232328]">
                        <button
                          type="button"
                          onClick={() => onChange({
                            textType: 'subtitle' as TextType,
                            textFont: state.textFont === 'serif' ? 'sans' : (state.textFont ?? 'sans'),
                            textVerticalPosition: (state.textVerticalPosition ?? 84) < 70 ? 84 : state.textVerticalPosition,
                          })}
                          className={`py-2 px-3 text-xs font-medium rounded-md transition-all text-center cursor-pointer ${
                            !isQuote
                              ? 'bg-[#EAE8E2] text-[#0A0A0B] font-semibold shadow-sm'
                              : 'text-[#9E9C96] hover:text-[#EAE8E2]'
                          }`}
                        >
                          Subtítulo de Película
                        </button>
                        <button
                          type="button"
                          onClick={() => onChange({
                            textType: 'quote' as TextType,
                            textFont: state.textFont === 'sans' ? 'serif' : (state.textFont ?? 'serif'),
                            textColor: state.textColor === '#FFFFFF' ? '#F4EFE6' : (state.textColor ?? '#F4EFE6'),
                            textVerticalPosition: (state.textVerticalPosition ?? 84) > 80 ? 60 : state.textVerticalPosition,
                          })}
                          className={`py-2 px-3 text-xs font-medium rounded-md transition-all text-center cursor-pointer ${
                            isQuote
                              ? 'bg-[#EAE8E2] text-[#0A0A0B] font-semibold shadow-sm'
                              : 'text-[#9E9C96] hover:text-[#EAE8E2]'
                          }`}
                        >
                          Cita de Autor (Quote)
                        </button>
                      </div>
                    </div>

                    {/* Main Text Content */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor="quote-text-input" className="text-[#9E9C96]">
                          {isQuote ? 'Frase o Cita' : 'Diálogo de Subtítulo'}
                        </label>
                        <span className="text-[10px] text-[#686662]">Ajuste automático</span>
                      </div>
                      <textarea
                        id="quote-text-input"
                        value={state.text ?? ''}
                        onChange={(e) => onChange({ text: e.target.value })}
                        rows={3}
                        className="w-full bg-[#121215] border border-[#232328] rounded-md px-3.5 py-2.5 text-sm text-[#EAE8E2] focus:outline-none focus:border-[#D8C7A5] transition-colors font-sans placeholder:text-[#52504C] resize-y min-h-[64px] max-h-[160px]"
                        placeholder={isQuote ? '«El tiempo es un fuego que me consume, pero yo soy el fuego…»' : '—Somos guardianes de la bahía—'}
                      />
                    </div>

                    {/* Attribution / Author */}
                    <div className="space-y-2 pt-2 border-t border-[#1F1F24]">
                      <div className="flex items-center justify-between text-xs">
                        <label htmlFor="quote-author-input" className="text-[#9E9C96]">
                          Atribución o Título de Film (opcional)
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-[#9E9C96] hover:text-[#EAE8E2]">
                          <input
                            type="checkbox"
                            checked={state.showAuthor ?? true}
                            onChange={(e) => onChange({ showAuthor: e.target.checked })}
                            className="accent-[#D8C7A5] cursor-pointer"
                          />
                          <span>Visible</span>
                        </label>
                      </div>
                      <input
                        id="quote-author-input"
                        type="text"
                        value={state.textAuthor ?? ''}
                        onChange={(e) => onChange({ textAuthor: e.target.value })}
                        placeholder={isQuote ? 'Jorge Luis Borges / Blade Runner 2049' : 'Título del film o escena'}
                        className="w-full bg-[#121215] border border-[#232328] rounded-md px-3 py-2 text-xs text-[#EAE8E2] focus:outline-none focus:border-[#D8C7A5] transition-colors placeholder:text-[#52504C]"
                      />
                    </div>

                    {/* Typography Font & Color */}
                    <div className="space-y-4 pt-2 border-t border-[#1F1F24]">
                      {/* Font */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-[#9E9C96]">Familia Tipográfica</span>
                          <span className="text-[10px] text-[#D8C7A5] font-mono">
                            {FONT_STACKS[state.textFont]?.label ?? 'Tipografía'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {FONT_OPTIONS.map((font) => {
                            const isSelected =
                              state.textFont === font.id ||
                              (font.id === 'elegant-typewriter' && state.textFont === 'courier-prime');
                            return (
                              <button
                                key={font.id}
                                type="button"
                                onClick={() => onChange({ textFont: font.id })}
                                style={{ fontFamily: FONT_STACKS[font.id]?.family }}
                                className={`py-2 px-2.5 rounded-md border transition-all cursor-pointer text-left flex flex-col justify-center ${
                                  isSelected
                                    ? 'bg-[#EAE8E2] text-[#0A0A0B] border-[#EAE8E2] font-semibold shadow-sm'
                                    : 'bg-[#141417] text-[#9E9C96] border-[#232328] hover:text-[#EAE8E2] hover:border-[#383842]'
                                }`}
                              >
                                <span className="text-[11px] leading-tight font-medium truncate">{font.label}</span>
                                <span className={`text-[9px] mt-0.5 font-sans truncate ${isSelected ? 'text-[#3E3C36]' : 'text-[#686662]'}`}>
                                  {font.subtitle}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Color Palette */}
                      <div className="space-y-1.5">
                        <span className="text-xs text-[#9E9C96]">Tono Cromático</span>
                        <div className="flex overflow-x-auto gap-2 pb-1 no-scrollbar lg:flex-wrap">
                          {CINEMATIC_TEXT_COLORS.map((col) => {
                            const isSelected = state.textColor === col.value;
                            return (
                              <button
                                key={col.id}
                                type="button"
                                onClick={() => onChange({ textColor: col.value })}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-all cursor-pointer shrink-0 lg:shrink ${
                                  isSelected
                                    ? 'bg-[#212128] border-[#D8C7A5] text-[#EAE8E2]'
                                    : 'bg-[#141417] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2]'
                                }`}
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full ring-1 ring-black/40"
                                  style={{ backgroundColor: col.value }}
                                />
                                <span className="text-[11px]">{col.label.split('/')[0].trim()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Alignment & Readability Shadow */}
                    <div className="space-y-4 pt-2 border-t border-[#1F1F24]">
                      {/* Alignment */}
                      <div className="space-y-1.5">
                        <span className="text-xs text-[#9E9C96]">Alineación</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => onChange({ textAlign: align })}
                              className={`py-1.5 px-2 text-xs font-medium rounded-md border transition-all cursor-pointer ${
                                (state.textAlign ?? 'center') === align
                                  ? 'bg-[#EAE8E2] text-[#0A0A0B] border-[#EAE8E2] font-semibold'
                                  : 'bg-[#141417] text-[#9E9C96] border-[#232328] hover:text-[#EAE8E2]'
                              }`}
                            >
                              {align === 'left' ? 'Izquierda' : align === 'center' ? 'Centro' : 'Derecha'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Contrast shadow toggle */}
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => onChange({ textShadow: !(state.textShadow ?? true) })}
                          className={`w-full py-2 px-3 rounded-md border flex items-center justify-between text-xs transition-all cursor-pointer ${
                            (state.textShadow ?? true)
                              ? 'bg-[#18181D] border-[#D8C7A5]/60 text-[#EAE8E2]'
                              : 'bg-[#121215] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2]'
                          }`}
                        >
                          <span>{isQuote ? 'Sombra de profundidad' : 'Contorno de subtítulo'}</span>
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            (state.textShadow ?? true) ? 'bg-[#D8C7A5] border-[#D8C7A5] text-[#0A0A0B]' : 'border-[#383842]'
                          }`}>
                            {(state.textShadow ?? true) && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Fondo del texto (Banda translúcida) */}
                    <div className="space-y-4 pt-3 border-t border-[#1F1F24]">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96] block">
                            Fondo del texto
                          </span>
                          <span className="text-[10px] text-[#686662]">
                            Banda translúcida adaptada a cada línea
                          </span>
                        </div>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={state.textBackground ?? false}
                          onClick={() => onChange({ textBackground: !(state.textBackground ?? false) })}
                          className={`h-7 px-3 rounded-md border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                            (state.textBackground ?? false)
                              ? 'bg-[#18181D] border-[#D8C7A5]/70 text-[#EAE8E2]'
                              : 'bg-[#121215] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2]'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            (state.textBackground ?? false) ? 'bg-[#D8C7A5]' : 'bg-[#404048]'
                          }`} />
                          <span>{(state.textBackground ?? false) ? 'Activado' : 'Desactivado'}</span>
                        </button>
                      </div>

                      {(state.textBackground ?? false) && (
                        <div className="space-y-4 pt-1">
                          {/* Color Palette for Background */}
                          <div className="space-y-1.5">
                            <span className="text-xs text-[#9E9C96]">Color de fondo</span>
                            <div className="flex overflow-x-auto items-center gap-2 pb-1 no-scrollbar lg:flex-wrap">
                              {CINEMATIC_BG_COLORS.map((bgCol) => {
                                const isSelected = (state.textBackgroundColor ?? '#000000') === bgCol.value;
                                return (
                                  <button
                                    key={bgCol.id}
                                    type="button"
                                    onClick={() => onChange({ textBackgroundColor: bgCol.value })}
                                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-all cursor-pointer shrink-0 lg:shrink ${
                                      isSelected
                                        ? 'bg-[#212128] border-[#D8C7A5] text-[#EAE8E2]'
                                        : 'bg-[#141417] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2]'
                                    }`}
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                                      style={{ backgroundColor: bgCol.value }}
                                    />
                                    <span className="text-[11px]">{bgCol.label}</span>
                                  </button>
                                );
                              })}

                              {/* Custom Color Input */}
                              <label 
                                title="Color personalizado"
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#232328] bg-[#141417] text-[#9E9C96] hover:text-[#EAE8E2] text-[11px] cursor-pointer shrink-0 lg:shrink"
                              >
                                <input
                                  type="color"
                                  value={state.textBackgroundColor ?? '#000000'}
                                  onChange={(e) => onChange({ textBackgroundColor: e.target.value })}
                                  className="w-3.5 h-3.5 rounded bg-transparent border-0 cursor-pointer p-0"
                                />
                                <span>Personalizado</span>
                              </label>
                            </div>
                          </div>

                          {/* Opacity Slider (15% to 85%) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#9E9C96]">Opacidad del fondo</span>
                              <span className="font-mono text-[#D8C7A5]">
                                {state.textBackgroundOpacity ?? 70}%
                              </span>
                            </div>
                            <input
                              type="range"
                              aria-label="Opacidad del fondo"
                              min="15"
                              max="85"
                              step="1"
                              value={state.textBackgroundOpacity ?? 70}
                              onChange={(e) => onChange({ textBackgroundOpacity: Number(e.target.value) })}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                              <span>15% Sutil</span>
                              <span>70% Predeterminado</span>
                              <span>85% Denso</span>
                            </div>
                          </div>

                          {/* Corner Radius Slider (0 to 20 px) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#9E9C96]">Radio de esquinas</span>
                              <span className="font-mono text-[#D8C7A5]">
                                {state.textBackgroundRadius ?? 6} px
                              </span>
                            </div>
                            <input
                              type="range"
                              aria-label="Radio de esquinas"
                              min="0"
                              max="20"
                              step="1"
                              value={state.textBackgroundRadius ?? 6}
                              onChange={(e) => onChange({ textBackgroundRadius: Number(e.target.value) })}
                              className="w-full"
                            />
                            <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                              <span>0 px Recto</span>
                              <span>6 px Suave</span>
                              <span>20 px Redondeado</span>
                            </div>
                          </div>

                          {/* Horizontal & Vertical Padding in a 2-column grid */}
                          <div className="grid grid-cols-2 gap-3">
                            {/* Horizontal Padding */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#9E9C96]">Espaciado H</span>
                                <span className="font-mono text-[#D8C7A5]">
                                  {state.textBackgroundPaddingX ?? 16} px
                                </span>
                              </div>
                              <input
                                type="range"
                                aria-label="Espaciado horizontal del fondo"
                                min="4"
                                max="40"
                                step="1"
                                value={state.textBackgroundPaddingX ?? 16}
                                onChange={(e) => onChange({ textBackgroundPaddingX: Number(e.target.value) })}
                                className="w-full"
                              />
                            </div>

                            {/* Vertical Padding */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#9E9C96]">Espaciado V</span>
                                <span className="font-mono text-[#D8C7A5]">
                                  {state.textBackgroundPaddingY ?? 8} px
                                </span>
                              </div>
                              <input
                                type="range"
                                aria-label="Espaciado vertical del fondo"
                                min="2"
                                max="24"
                                step="1"
                                value={state.textBackgroundPaddingY ?? 8}
                                onChange={(e) => onChange({ textBackgroundPaddingY: Number(e.target.value) })}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sizing & Safe Margin Sliders */}
                    <div className="space-y-4 pt-2 border-t border-[#1F1F24]">
                      {/* Size */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#9E9C96]">Tamaño de tipografía</span>
                          <span className="font-mono text-[#D8C7A5]">{state.textSize ?? 35} pt</span>
                        </div>
                        <input
                          type="range"
                          aria-label="Tamaño de tipografía"
                          min="18"
                          max="75"
                          step="1"
                          value={state.textSize ?? 35}
                          onChange={(e) => onChange({ textSize: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      {/* Vertical Position */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#9E9C96]">Posición vertical</span>
                          <span className="font-mono text-[#D8C7A5]">{state.textVerticalPosition ?? 84}%</span>
                        </div>
                        <input
                          type="range"
                          aria-label="Posición vertical"
                          min="15"
                          max="92"
                          step="1"
                          value={state.textVerticalPosition ?? 84}
                          onChange={(e) => onChange({ textVerticalPosition: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      {/* Horizontal Position */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#9E9C96]">Posición horizontal</span>
                          <span className="font-mono text-[#D8C7A5]">{state.textHorizontalPosition ?? 50}%</span>
                        </div>
                        <input
                          type="range"
                          aria-label="Posición horizontal"
                          min="10"
                          max="90"
                          step="1"
                          value={state.textHorizontalPosition ?? 50}
                          onChange={(e) => onChange({ textHorizontalPosition: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Reset Typography Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={onResetText ?? (() => {
                          onChange({
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
                            template: undefined,
                            timestampEnabled: false,
                            creditEnabled: false,
                          });
                        })}
                        className="w-full py-2 px-3 rounded-md border border-[#232328] bg-[#121215] text-[#9E9C96] hover:text-[#EAE8E2] hover:border-[#35353C] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restablecer tipografía a inicial
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-lg bg-[#121215] border border-[#232328] text-center text-xs text-[#9E9C96] space-y-1">
                    <p>La frase principal está actualmente oculta.</p>
                    <p className="text-[11px] text-[#686662]">Activa la casilla para componer citas o subtítulos.</p>
                  </div>
                )}
              </div>
            )}

            {/* SUB-TAB 2: DETALLES CINEMATOGRÁFICOS (MARCAS DE TIEMPO) */}
            {textSubTab === 'timestamp' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Header & Toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-[#1F1F24]">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96] block">
                      Detalles Cinematográficos
                    </span>
                    <span className="text-[10px] text-[#686662]">
                      Marcas de tiempo, códigos de escena y numeración de fotograma
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    id="timestamp-toggle"
                    aria-checked={state.timestampEnabled ?? false}
                    onClick={() => onChange({ 
                      timestampEnabled: !(state.timestampEnabled ?? false),
                      timestampText: state.timestampText?.trim() ? state.timestampText : 'OCT. 1998'
                    })}
                    className={`h-7 px-3 rounded-md border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      (state.timestampEnabled ?? false)
                        ? 'bg-[#18181D] border-[#D8C7A5]/70 text-[#EAE8E2]'
                        : 'bg-[#121215] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      (state.timestampEnabled ?? false) ? 'bg-[#F59E0B]' : 'bg-[#404048]'
                    }`} />
                    <span>{(state.timestampEnabled ?? false) ? 'Activado' : 'Desactivado'}</span>
                  </button>
                </div>

                {/* Presets Gallery */}
                <div className="space-y-2.5">
                  <span className="text-xs text-[#9E9C96] font-medium block">
                    Composiciones Predefinidas
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {TIMESTAMP_PRESETS.map((preset) => {
                      const isSelected = state.timestampPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onChange({
                            timestampEnabled: true,
                            timestampPreset: preset.id,
                            timestampText: preset.defaultText,
                            timestampFont: preset.defaultFont,
                            timestampColor: preset.defaultColor,
                            timestampPosition: preset.defaultPosition,
                          })}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? 'bg-[#1C1C22] border-[#D8C7A5] ring-1 ring-[#D8C7A5]/50'
                              : 'bg-[#121215] border-[#232328] hover:border-[#35353C] hover:bg-[#151518]'
                          }`}
                        >
                          <span className="text-[11px] font-medium text-[#EAE8E2] truncate">{preset.label}</span>
                          <span className="text-[10px] font-mono text-[#D8C7A5] truncate tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-[#232328]">
                            {preset.example}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Manual Text Input */}
                <div className="space-y-2 pt-2 border-t border-[#1F1F24]">
                  <div className="flex items-center justify-between text-xs">
                    <label htmlFor="timestamp-text-input" className="text-[#9E9C96]">
                      Contenido de la Marca
                    </label>
                    <span className="text-[10px] text-[#686662] font-mono">Texto libre</span>
                  </div>
                  <input
                    id="timestamp-text-input"
                    type="text"
                    value={state.timestampText ?? ''}
                    onChange={(e) => onChange({ timestampText: e.target.value })}
                    placeholder="OCT. 1998 / 23:47 / ESCENA 04 · TOMA 02"
                    className="w-full bg-[#121215] border border-[#232328] rounded-md px-3.5 py-2 text-xs text-[#EAE8E2] focus:outline-none focus:border-[#D8C7A5] transition-colors font-mono placeholder:text-[#52504C]"
                  />
                </div>

                {/* Position in frame (4 corners) */}
                <div className="space-y-2 pt-2 border-t border-[#1F1F24]">
                  <span className="text-xs text-[#9E9C96] font-medium block">
                    Posición en el Fotograma
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'top-left', label: '↖ Superior Izq.' },
                      { id: 'top-right', label: 'Superior Der. ↗' },
                      { id: 'bottom-left', label: '↙ Inferior Izq.' },
                      { id: 'bottom-right', label: 'Inferior Der. ↘' },
                    ].map((pos) => {
                      const isSelected = (state.timestampPosition ?? 'bottom-right') === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => onChange({ timestampPosition: pos.id as TimestampPosition })}
                          className={`py-2 px-2 text-xs font-medium rounded-md border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#EAE8E2] text-[#0A0A0B] border-[#EAE8E2] font-semibold'
                              : 'bg-[#141417] text-[#9E9C96] border-[#232328] hover:text-[#EAE8E2]'
                          }`}
                        >
                          {pos.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Typography Font */}
                <div className="space-y-2 pt-2 border-t border-[#1F1F24]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9E9C96]">Tipografía</span>
                    <span className="text-[10px] text-[#D8C7A5] font-mono">
                      {FONT_STACKS[state.timestampFont ?? 'mono']?.label ?? 'Monospace'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'mono', label: 'Monospace' },
                      { id: 'type-machine', label: 'Máquina' },
                      { id: 'sans', label: 'Sans Cine' },
                      { id: 'montserrat', label: 'Editorial' },
                      { id: 'serif', label: 'Serif' },
                      { id: 'elegant-typewriter', label: 'Typewriter' },
                    ].map((f) => {
                      const isSelected = (state.timestampFont ?? 'mono') === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onChange({ timestampFont: f.id as TextFont })}
                          className={`py-1.5 px-2 rounded-md border text-[11px] font-medium transition-all cursor-pointer truncate ${
                            isSelected
                              ? 'bg-[#EAE8E2] text-[#0A0A0B] border-[#EAE8E2] font-semibold'
                              : 'bg-[#141417] text-[#9E9C96] border-[#232328] hover:text-[#EAE8E2]'
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Palette */}
                <div className="space-y-2 pt-2 border-t border-[#1F1F24]">
                  <span className="text-xs text-[#9E9C96]">Color de la Marca</span>
                  <div className="flex overflow-x-auto items-center gap-2 pb-1 no-scrollbar lg:flex-wrap">
                    {[
                      { id: 'amber', label: 'Ámbar LED', value: '#F97316' },
                      { id: 'gold', label: 'Oro Vintage', value: '#F59E0B' },
                      { id: 'white', label: 'Blanco Sutil', value: '#EAE8E2' },
                      { id: 'cream', label: 'Marfil Suave', value: '#F4EFE6' },
                      { id: 'red', label: 'Rojo Cámara', value: '#EF4444' },
                      { id: 'dim', label: 'Gris Grafito', value: '#9E9C96' },
                    ].map((c) => {
                      const isSelected = (state.timestampColor ?? '#F97316').toLowerCase() === c.value.toLowerCase();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onChange({ timestampColor: c.value })}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-all cursor-pointer shrink-0 lg:shrink ${
                            isSelected
                              ? 'bg-[#212128] border-[#D8C7A5] text-[#EAE8E2]'
                              : 'bg-[#141417] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2]'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                            style={{ backgroundColor: c.value }}
                          />
                          <span className="text-[11px]">{c.label}</span>
                        </button>
                      );
                    })}
                    <label 
                      title="Color libre"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#232328] bg-[#141417] text-[#9E9C96] hover:text-[#EAE8E2] text-[11px] cursor-pointer shrink-0 lg:shrink"
                    >
                      <input
                        type="color"
                        value={state.timestampColor ?? '#F97316'}
                        onChange={(e) => onChange({ timestampColor: e.target.value })}
                        className="w-3.5 h-3.5 rounded bg-transparent border-0 cursor-pointer p-0"
                      />
                      <span>Color libre</span>
                    </label>
                  </div>
                </div>

                {/* Sizing & Opacity Sliders */}
                <div className="space-y-4 pt-2 border-t border-[#1F1F24]">
                  {/* Size */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9E9C96]">Tamaño</span>
                      <span className="font-mono text-[#D8C7A5]">{state.timestampSize ?? 20} pt</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Tamaño de la marca de tiempo"
                      min="10"
                      max="40"
                      step="1"
                      value={state.timestampSize ?? 20}
                      onChange={(e) => onChange({ timestampSize: Number(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                      <span>10 pt Discreto</span>
                      <span>20 pt Equilibrado</span>
                      <span>40 pt Destacado</span>
                    </div>
                  </div>

                  {/* Opacity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9E9C96]">Opacidad</span>
                      <span className="font-mono text-[#D8C7A5]">{state.timestampOpacity ?? 85}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Opacidad de la marca de tiempo"
                      min="15"
                      max="100"
                      step="1"
                      value={state.timestampOpacity ?? 85}
                      onChange={(e) => onChange({ timestampOpacity: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Reset Timestamp button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onChange({
                      timestampEnabled: false,
                      timestampText: 'OCT. 1998',
                      timestampPreset: 'analog-date',
                      timestampPosition: 'bottom-right',
                      timestampSize: 20,
                      timestampColor: '#F97316',
                      timestampOpacity: 85,
                      timestampFont: 'mono'
                    })}
                    className="w-full py-2 px-3 rounded-md border border-[#232328] bg-[#121215] text-[#9E9C96] hover:text-[#EAE8E2] hover:border-[#35353C] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restablecer detalles cinematográficos
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: CRÉDITOS DE PELÍCULA */}
            {textSubTab === 'credits' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Header & Toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-[#1F1F24]">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96] block">
                      Créditos Cinematográficos
                    </span>
                    <span className="text-[10px] text-[#686662]">
                      A FILM BY, DIRECTED BY, STARRING o créditos personalizados
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    id="credit-toggle"
                    aria-checked={state.creditEnabled ?? false}
                    onClick={() => onChange({ 
                      creditEnabled: !(state.creditEnabled ?? false),
                      creditRole: state.creditRole?.trim() ? state.creditRole : 'A FILM BY',
                      creditName: state.creditName?.trim() ? state.creditName : 'DIRECTOR NAME'
                    })}
                    className={`h-7 px-3 rounded-md border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      (state.creditEnabled ?? false)
                        ? 'bg-[#18181D] border-[#D8C7A5]/70 text-[#EAE8E2]'
                        : 'bg-[#121215] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      (state.creditEnabled ?? false) ? 'bg-[#D8C7A5]' : 'bg-[#404048]'
                    }`} />
                    <span>{(state.creditEnabled ?? false) ? 'Activado' : 'Desactivado'}</span>
                  </button>
                </div>

                {/* Presets Gallery */}
                <div className="space-y-2.5">
                  <span className="text-xs text-[#9E9C96] font-medium block">
                    Composiciones de Créditos
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {CREDIT_PRESETS.map((preset) => {
                      const isSelected = state.creditPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onChange({
                            creditEnabled: true,
                            creditPreset: preset.id,
                            creditRole: preset.defaultRole,
                            creditName: preset.defaultName,
                            creditFont: preset.defaultFont,
                            creditPosition: preset.defaultPosition,
                            creditAlign: preset.defaultAlign,
                          })}
                          className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isSelected
                              ? 'bg-[#1C1C22] border-[#D8C7A5] ring-1 ring-[#D8C7A5]/50'
                              : 'bg-[#121215] border-[#232328] hover:border-[#35353C] hover:bg-[#151518]'
                          }`}
                        >
                          <span className="text-[11px] font-medium text-[#EAE8E2] truncate">{preset.label}</span>
                          <span className="text-[10px] font-mono text-[#D8C7A5] truncate tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-[#232328]">
                            {preset.example}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Text Inputs: Role & Name */}
                <div className="space-y-3 pt-2 border-t border-[#1F1F24]">
                  <div className="space-y-1">
                    <label htmlFor="credit-role-input" className="text-xs text-[#9E9C96] block">
                      Encabezado o Rol (línea secundaria)
                    </label>
                    <input
                      id="credit-role-input"
                      type="text"
                      value={state.creditRole ?? ''}
                      onChange={(e) => onChange({ creditRole: e.target.value })}
                      placeholder="A FILM BY / DIRECTED BY / BASED ON"
                      className="w-full bg-[#121215] border border-[#232328] rounded-md px-3 py-2 text-xs text-[#EAE8E2] focus:outline-none focus:border-[#D8C7A5] transition-colors placeholder:text-[#52504C] tracking-wide"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="credit-name-input" className="text-xs text-[#9E9C96] block">
                      Nombre o Crédito Principal
                    </label>
                    <input
                      id="credit-name-input"
                      type="text"
                      value={state.creditName ?? ''}
                      onChange={(e) => onChange({ creditName: e.target.value })}
                      placeholder="SOFÍA COPPOLA / A TRUE MEMORY"
                      className="w-full bg-[#121215] border border-[#232328] rounded-md px-3 py-2 text-xs text-[#EAE8E2] focus:outline-none focus:border-[#D8C7A5] transition-colors placeholder:text-[#52504C]"
                    />
                  </div>
                </div>

                {/* Position & Alignment */}
                <div className="space-y-3 pt-2 border-t border-[#1F1F24]">
                  {/* Position */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-[#9E9C96]">Ubicación</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'bottom-center', label: 'Inferior' },
                        { id: 'top-center', label: 'Superior' },
                      ].map((pos) => {
                        const isSelected = (state.creditPosition ?? 'bottom-center').startsWith(pos.id.split('-')[0]);
                        return (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => onChange({ creditPosition: pos.id as CreditPosition })}
                            className={`py-1.5 px-2 text-xs font-medium rounded-md border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#EAE8E2] text-[#0A0A0B] border-[#EAE8E2] font-semibold'
                                : 'bg-[#141417] text-[#9E9C96] border-[#232328] hover:text-[#EAE8E2]'
                            }`}
                          >
                            {pos.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Alignment */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-[#9E9C96]">Alineación</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['left', 'center', 'right'] as TextAlign[]).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => onChange({ creditAlign: align })}
                          className={`py-1.5 px-2 text-xs font-medium rounded-md border transition-all cursor-pointer ${
                            (state.creditAlign ?? 'center') === align
                              ? 'bg-[#EAE8E2] text-[#0A0A0B] border-[#EAE8E2] font-semibold'
                              : 'bg-[#141417] text-[#9E9C96] border-[#232328] hover:text-[#EAE8E2]'
                          }`}
                        >
                          {align === 'left' ? 'Izquierda' : align === 'center' ? 'Centro' : 'Derecha'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Typography Font */}
                <div className="space-y-2 pt-2 border-t border-[#1F1F24]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#9E9C96]">Tipografía</span>
                    <span className="text-[10px] text-[#D8C7A5] font-mono">
                      {FONT_STACKS[state.creditFont ?? 'montserrat']?.label ?? 'Editorial'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'montserrat', label: 'Editorial Sans' },
                      { id: 'serif', label: 'Serif Clásica' },
                      { id: 'sans', label: 'Sans Cine' },
                      { id: 'type-machine', label: 'Máquina' },
                      { id: 'elegant-typewriter', label: 'Typewriter' },
                      { id: 'mono', label: 'Monospace' },
                    ].map((f) => {
                      const isSelected = (state.creditFont ?? 'montserrat') === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onChange({ creditFont: f.id as TextFont })}
                          className={`py-1.5 px-2 rounded-md border text-[11px] font-medium transition-all cursor-pointer truncate ${
                            isSelected
                              ? 'bg-[#EAE8E2] text-[#0A0A0B] border-[#EAE8E2] font-semibold'
                              : 'bg-[#141417] text-[#9E9C96] border-[#232328] hover:text-[#EAE8E2]'
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Palette */}
                <div className="space-y-2 pt-2 border-t border-[#1F1F24]">
                  <span className="text-xs text-[#9E9C96]">Tono Cromático</span>
                  <div className="flex overflow-x-auto items-center gap-2 pb-1 no-scrollbar lg:flex-wrap">
                    {[
                      { id: 'warm-white', label: 'Marfil / Cálido', value: '#F4EFE6' },
                      { id: 'pure-white', label: 'Blanco Puro', value: '#FFFFFF' },
                      { id: 'gold', label: 'Arena / Dorado', value: '#E2D3B8' },
                      { id: 'muted', label: 'Gris Editorial', value: '#9E9C96' },
                    ].map((c) => {
                      const isSelected = (state.creditColor ?? '#F4EFE6').toLowerCase() === c.value.toLowerCase();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => onChange({ creditColor: c.value })}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition-all cursor-pointer shrink-0 lg:shrink ${
                            isSelected
                              ? 'bg-[#212128] border-[#D8C7A5] text-[#EAE8E2]'
                              : 'bg-[#141417] border-[#232328] text-[#9E9C96] hover:text-[#EAE8E2]'
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20"
                            style={{ backgroundColor: c.value }}
                          />
                          <span className="text-[11px]">{c.label}</span>
                        </button>
                      );
                    })}
                    <label 
                      title="Color libre"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#232328] bg-[#141417] text-[#9E9C96] hover:text-[#EAE8E2] text-[11px] cursor-pointer shrink-0 lg:shrink"
                    >
                      <input
                        type="color"
                        value={state.creditColor ?? '#F4EFE6'}
                        onChange={(e) => onChange({ creditColor: e.target.value })}
                        className="w-3.5 h-3.5 rounded bg-transparent border-0 cursor-pointer p-0"
                      />
                      <span>Color libre</span>
                    </label>
                  </div>
                </div>

                {/* Sizing & Opacity Sliders */}
                <div className="space-y-4 pt-2 border-t border-[#1F1F24]">
                  {/* Size */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9E9C96]">Tamaño</span>
                      <span className="font-mono text-[#D8C7A5]">{state.creditSize ?? 22} pt</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Tamaño de los créditos"
                      min="12"
                      max="38"
                      step="1"
                      value={state.creditSize ?? 22}
                      onChange={(e) => onChange({ creditSize: Number(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px] text-[#686662] font-mono">
                      <span>12 pt Minimal</span>
                      <span>22 pt Sobrio</span>
                      <span>38 pt Protagonista</span>
                    </div>
                  </div>

                  {/* Opacity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9E9C96]">Opacidad</span>
                      <span className="font-mono text-[#D8C7A5]">{state.creditOpacity ?? 85}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Opacidad de los créditos"
                      min="20"
                      max="100"
                      step="1"
                      value={state.creditOpacity ?? 85}
                      onChange={(e) => onChange({ creditOpacity: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Reset Credits button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onChange({
                      creditEnabled: false,
                      creditRole: 'A FILM BY',
                      creditName: 'DIRECTOR NAME',
                      creditPreset: 'film-by',
                      creditPosition: 'bottom-center',
                      creditAlign: 'center',
                      creditSize: 22,
                      creditColor: '#F4EFE6',
                      creditOpacity: 85,
                      creditFont: 'montserrat'
                    })}
                    className="w-full py-2 px-3 rounded-md border border-[#232328] bg-[#121215] text-[#9E9C96] hover:text-[#EAE8E2] hover:border-[#35353C] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restablecer créditos de película
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* FOOTER ACTIONS IN SIDEBAR */}
      {!hideFooterActions && (
        <div className="p-4 border-t border-[#232328] bg-[#121215] shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetCurrentSection}
              className="text-xs text-[#9E9C96] hover:text-[#EAE8E2] transition-colors py-1 px-2 rounded hover:bg-[#18181D] cursor-pointer flex items-center gap-1.5"
              title="Restablece únicamente los ajustes de la pestaña actual sin alterar las demás"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#D8C7A5]" />
              <span>Restablecer sección</span>
            </button>
            <span className="text-[#35353C] text-xs">|</span>
            <button
              type="button"
              onClick={onReset}
              className="text-[11px] text-[#6E6C66] hover:text-[#9E9C96] transition-colors py-1 px-1.5 cursor-pointer"
              title="Restablece todos los parámetros del editor a valores iniciales"
            >
              Todo
            </button>
          </div>

          <button
            type="button"
            onClick={onDownload}
            className="py-2.5 px-4 bg-[#EAE8E2] hover:bg-white text-[#0A0A0B] text-xs font-semibold rounded-md transition-all flex items-center gap-2 cursor-pointer shadow-sm tracking-wide"
          >
            Exportar JPG
          </button>
        </div>
      )}

    </div>
  );
}
