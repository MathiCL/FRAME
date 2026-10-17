'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, RotateCw, X, Check, Eye } from 'lucide-react';
import type { EditorState, CreativeProposal } from '@/types/editor';
import { generateCreativeProposals, applyProposalSettings } from '@/lib/surprise';
import { renderCinematicFrame } from '@/lib/canvas';

export interface SurpriseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: EditorState;
  onApplyProposal: (proposal: CreativeProposal) => void;
  onPreviewProposal?: (proposal: CreativeProposal) => void;
  onRevertPreview?: () => void;
}

interface ProposalCardProps {
  proposal: CreativeProposal;
  currentState: EditorState;
  isSelectedForPreview: boolean;
  onPreview: (proposal: CreativeProposal) => void;
  onApply: (proposal: CreativeProposal) => void;
}

function ProposalCard({
  proposal,
  currentState,
  isSelectedForPreview,
  onPreview,
  onApply,
}: ProposalCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Renderiza una miniatura visual real de la fotografía con los ajustes de la propuesta
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentState.image) return;

    const previewState = applyProposalSettings(currentState, proposal);
    renderCinematicFrame({
      state: previewState,
      canvas,
      showOriginal: false,
    });
  }, [proposal, currentState]);

  return (
    <div
      className={`group relative flex flex-col rounded-xl border transition-all duration-200 overflow-hidden bg-[#121215] ${
        isSelectedForPreview
          ? 'border-[#D8C7A5] ring-2 ring-[#D8C7A5]/40 shadow-[0_0_24px_rgba(216,199,165,0.15)] bg-[#17171C]'
          : 'border-[#232328] hover:border-[#383842] hover:bg-[#15151A]'
      }`}
    >
      {/* Miniatura visual real del fotograma */}
      <div className="relative w-full aspect-[16/10] bg-[#0A0A0B] overflow-hidden flex items-center justify-center border-b border-[#202025]">
        <canvas
          ref={canvasRef}
          width={320}
          height={200}
          className="w-full h-full object-contain pointer-events-none select-none"
        />

        {/* Badge superior */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full bg-black/80 text-[#D8C7A5] border border-[#2B2B34] backdrop-blur-sm">
            {proposal.badge}
          </span>
          {isSelectedForPreview && (
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-[#D8C7A5] text-[#0A0A0B] font-bold">
              En pantalla
            </span>
          )}
        </div>
      </div>

      {/* Contenido descriptivo */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-[#EAE8E2] group-hover:text-white">
              {proposal.name}
            </h3>
          </div>
          <p className="text-[11px] text-[#8E8C86] leading-relaxed line-clamp-2">
            {proposal.description}
          </p>
        </div>

        {/* Metadatos estilísticos discretos */}
        <div className="pt-2 border-t border-[#1F1F24] flex items-center justify-between text-[10px] text-[#6E6C66] font-mono">
          <span>Preset: {proposal.settings.preset}</span>
          {proposal.settings.glowEnabled && (
            <span className="text-[#D8C7A5]">
              Resplandor {proposal.settings.glowTone === 'red' ? '35mm' : proposal.settings.glowTone === 'warm' ? 'Cálido' : 'Neutro'}
            </span>
          )}
        </div>

        {/* Acciones de la tarjeta */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onPreview(proposal)}
            className={`py-1.5 px-2 rounded-md border text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isSelectedForPreview
                ? 'bg-[#23232C] text-[#EAE8E2] border-[#D8C7A5]'
                : 'bg-[#151518] text-[#9E9C96] border-[#2B2B32] hover:text-[#EAE8E2] hover:bg-[#1A1A20]'
            }`}
            title="Previsualizar en el lienzo principal"
          >
            <Eye className="w-3 h-3 text-[#D8C7A5]" />
            <span>Previsualizar</span>
          </button>

          <button
            type="button"
            onClick={() => onApply(proposal)}
            className="py-1.5 px-2 rounded-md bg-[#EAE8E2] hover:bg-white text-[#0A0A0B] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            title="Aplicar este tratamiento al editor"
          >
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Aplicar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function SurpriseModal({
  isOpen,
  onClose,
  currentState,
  onApplyProposal,
  onPreviewProposal,
  onRevertPreview,
}: SurpriseModalProps) {
  const [proposals, setProposals] = useState<CreativeProposal[]>(() => 
    generateCreativeProposals(currentState, Date.now())
  );
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = useCallback(() => {
    setIsRegenerating(true);
    const newProps = generateCreativeProposals(currentState, Date.now() + Math.random() * 1000);
    setProposals(newProps);
    setPreviewingId(null);
    onRevertPreview?.();
    setTimeout(() => setIsRegenerating(false), 250);
  }, [currentState, onRevertPreview]);

  const handlePreview = useCallback(
    (proposal: CreativeProposal) => {
      setPreviewingId(proposal.id);
      onPreviewProposal?.(proposal);
    },
    [onPreviewProposal]
  );

  const handleCancelAndClose = useCallback(() => {
    onRevertPreview?.();
    setPreviewingId(null);
    onClose();
  }, [onRevertPreview, onClose]);

  const handleApply = useCallback(
    (proposal: CreativeProposal) => {
      onApplyProposal(proposal);
      setPreviewingId(null);
      onClose();
    },
    [onApplyProposal, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="surprise-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0E0E11] border border-[#26262D] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="p-4 sm:p-5 border-b border-[#1F1F24] flex items-center justify-between shrink-0 bg-[#121216]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#23211B] border border-[#3E382A] flex items-center justify-center text-[#D8C7A5]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="surprise-modal-title" className="text-sm sm:text-base font-semibold tracking-wide text-[#EAE8E2]">
                Sorpréndeme
              </h2>
              <p className="text-[11px] text-[#8E8C86]">
                Tres visiones cinematográficas exclusivas para tu fotografía
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="h-8 px-2.5 sm:px-3 text-xs font-medium text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D] border border-[#2B2B32] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Generar tres propuestas distintas"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#D8C7A5] ${isRegenerating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Generar otras</span>
            </button>

            <button
              type="button"
              onClick={handleCancelAndClose}
              className="h-8 w-8 text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D] rounded-md transition-colors flex items-center justify-center cursor-pointer"
              title="Cerrar sin aplicar cambios"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Galería de 3 propuestas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-5">
            {proposals.map((prop) => (
              <ProposalCard
                key={prop.id}
                proposal={prop}
                currentState={currentState}
                isSelectedForPreview={previewingId === prop.id}
                onPreview={handlePreview}
                onApply={handleApply}
              />
            ))}
          </div>
        </div>

        {/* Pie de acción y aviso de seguridad */}
        <div className="p-3 sm:p-4 border-t border-[#1F1F24] bg-[#121216] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="text-[11px] text-[#6E6C66] text-center sm:text-left">
            Tu encuadre, textos, citas, créditos y marcos se conservan 100% intactos.
          </p>

          <button
            type="button"
            onClick={handleCancelAndClose}
            className="w-full sm:w-auto py-1.5 px-4 rounded-md border border-[#2B2B32] text-xs font-medium text-[#9E9C96] hover:text-[#EAE8E2] hover:bg-[#18181D] transition-colors cursor-pointer text-center"
          >
            Volver a mi edición
          </button>
        </div>
      </div>
    </div>
  );
}
