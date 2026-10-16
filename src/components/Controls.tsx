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
  Film
} from 'lucide-react';
import { 
  EditorState, 
  Preset, 
  TemplateId,
  FitMode, 
  TextType, 
  TextFont, 
  TextAlign, 
  AspectFormat 
} from '@/types/editor';
import { ASPECT_FORMATS, computeFrameLayout, getPanBounds } from '@/lib/geometry';
import { FONT_STACKS, CINEMATIC_TEXT_COLORS, CINEMATIC_BG_COLORS } from '@/lib/typography';
import { PRESET_GALLERY_LIST, getPresetDisplayName } from '@/lib/presets';
import { TEMPLATES_GALLERY_LIST, getTemplateDisplayName, applyTemplate } from '@/lib/templates';

interface ControlsProps {
  state: EditorState;
  onChange: (updates: Partial<EditorState>) => void;
  onDownload: () => void;
  onPresetSelect: (preset: Preset) => void;
  onPresetIntensityChange?: (intensity: number) => void;
  onTemplateSelect?: (templateId: TemplateId) => void;
  onReset: () => void;
  onResetFraming?: () => void;
  onResetColor?: () => void;
  onResetText?: () => void;
}

type TabKey = 'encuadre' | 'color' | 'textura' | 'texto';

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
  onResetText,
}: ControlsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('encuadre');

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
      
      {/* 4 MODULAR TABS HEADER */}
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

      {/* TAB CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        
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
                className="grid grid-cols-3 gap-2"
              >
                {ASPECT_FORMATS.map((fmt) => {
                  const isSelected = state.format === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onChange({ format: fmt.id as AspectFormat })}
                      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-md border text-center transition-all cursor-pointer ${
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

              {/* Gallery Grid */}
              <div 
                role="radiogroup" 
                aria-label="Seleccionar estilo cinematográfico"
                className="grid grid-cols-2 gap-2"
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
                      className={`group relative flex flex-col p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#18181D] border-[#D8C7A5] shadow-[0_0_12px_rgba(216,199,165,0.12)] ring-1 ring-[#D8C7A5]/60'
                          : 'bg-[#121215] border-[#232328] hover:border-[#383842] hover:bg-[#151518]'
                      }`}
                    >
                      {/* Swatch gradient header */}
                      <div 
                        className="w-full h-7 rounded mb-1.5 flex items-center justify-end px-1.5 shadow-inner relative overflow-hidden"
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

            {/* Information Box */}
            <div className="p-3.5 rounded-lg bg-[#121215] border border-[#232328] space-y-1.5 mt-2">
              <p className="text-xs text-[#D8C7A5] font-medium">Renderizado en alta resolución</p>
              <p className="text-[11px] text-[#9E9C96] leading-relaxed">
                El grano se sintetiza proceduralmente durante la exportación JPG final para evitar artefactos de compresión digital.
              </p>
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
            {/* Show / Hide text toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1F1F24]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9E9C96]">
                Texto Cinematográfico
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

                  {/* Templates Grid */}
                  <div 
                    role="radiogroup" 
                    aria-label="Seleccionar plantilla de composición"
                    className="grid grid-cols-2 gap-2"
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
                          className={`group relative flex flex-col p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#18181D] border-[#D8C7A5] shadow-[0_0_12px_rgba(216,199,165,0.12)] ring-1 ring-[#D8C7A5]/60'
                              : 'bg-[#121215] border-[#232328] hover:border-[#383842] hover:bg-[#151518]'
                          }`}
                        >
                          {/* Mini visual frame thumbnail */}
                          <div className="w-full h-9 rounded bg-[#0A0A0B] border border-[#202025] mb-1.5 flex items-center justify-center relative overflow-hidden shadow-inner">
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
                    <span className="text-xs text-[#9E9C96]">Familia Tipográfica</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['serif', 'sans', 'mono'] as TextFont[]).map((font) => (
                        <button
                          key={font}
                          type="button"
                          onClick={() => onChange({ textFont: font })}
                          className={`py-2 px-2 text-xs font-medium rounded-md border transition-all cursor-pointer ${
                            state.textFont === font
                              ? 'bg-[#EAE8E2] text-[#0A0A0B] border-[#EAE8E2] font-semibold'
                              : 'bg-[#141417] text-[#9E9C96] border-[#232328] hover:text-[#EAE8E2]'
                          }`}
                        >
                          {FONT_STACKS[font].label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Palette */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-[#9E9C96]">Tono Cromático</span>
                    <div className="flex flex-wrap gap-2">
                      {CINEMATIC_TEXT_COLORS.map((col) => {
                        const isSelected = state.textColor === col.value;
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => onChange({ textColor: col.value })}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-all cursor-pointer ${
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
                        <div className="flex flex-wrap items-center gap-2">
                          {CINEMATIC_BG_COLORS.map((bgCol) => {
                            const isSelected = (state.textBackgroundColor ?? '#000000') === bgCol.value;
                            return (
                              <button
                                key={bgCol.id}
                                type="button"
                                onClick={() => onChange({ textBackgroundColor: bgCol.value })}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-all cursor-pointer ${
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
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#232328] bg-[#141417] text-[#9E9C96] hover:text-[#EAE8E2] text-[11px] cursor-pointer"
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
                <p>El texto está actualmente oculto.</p>
                <p className="text-[11px] text-[#686662]">Activa la casilla para componer citas o subtítulos.</p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* FOOTER ACTIONS IN SIDEBAR */}
      <div className="p-4 border-t border-[#232328] bg-[#121215] shrink-0 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-[#9E9C96] hover:text-[#EAE8E2] transition-colors py-1.5 px-2 cursor-pointer flex items-center gap-1.5"
          title="Restablece todos los parámetros a los valores iniciales"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restablecer todo
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="py-2.5 px-4 bg-[#EAE8E2] hover:bg-white text-[#0A0A0B] text-xs font-semibold rounded-md transition-all flex items-center gap-2 cursor-pointer shadow-sm tracking-wide"
        >
          Exportar JPG
        </button>
      </div>

    </div>
  );
}
