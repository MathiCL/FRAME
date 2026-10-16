import React, { useCallback, useState } from 'react';
import { UploadCloud, Film, Sliders, Type, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageLoaded: (file: File) => void;
}

export function ImageUploader({ onImageLoaded }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validateAndLoad = useCallback((file: File) => {
    setErrorMessage(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (validTypes.includes(file.type) || file.type.startsWith('image/')) {
      onImageLoaded(file);
    } else {
      setErrorMessage('Por favor selecciona una imagen en formato JPG, PNG o WEBP.');
    }
  }, [onImageLoaded]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndLoad(files[0]);
    }
  }, [validateAndLoad]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      validateAndLoad(e.target.files[0]);
    }
  }, [validateAndLoad]);

  return (
    <div className="w-full flex flex-col items-center gap-10">
      {/* HERO TITLE & EDITORIAL INTRO */}
      <div className="text-center space-y-3 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161619] border border-[#26262B] text-[11px] tracking-[0.15em] text-[#D8C7A5] uppercase font-mono">
          <Film className="w-3.5 h-3.5" />
          Laboratorio Fotográfico
        </div>
        <h2 className="text-3xl md:text-4xl font-serif tracking-tight text-[#EAE8E2]">
          Convierte tu fotografía en un fotograma de cine
        </h2>
        <p className="text-sm md:text-[15px] text-[#9E9C96] leading-relaxed font-sans">
          Aplica proporciones cinematográficas, gradación de color analógica, grano de película y tipografía de autor con exportación directa en alta resolución.
        </p>
      </div>

      {/* DROPZONE */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`w-full max-w-xl rounded-xl border-2 border-dashed transition-all duration-200 relative overflow-hidden p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer ${
          isDragging
            ? 'border-[#D8C7A5] bg-[#16161B] ring-2 ring-[#D8C7A5]/20 scale-[1.01]'
            : 'border-[#26262B] bg-[#101012] hover:border-[#383840] hover:bg-[#131316]'
        }`}
      >
        <input
          type="file"
          id="photo-upload-input"
          aria-label="Cargar fotografía"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          accept="image/jpeg, image/png, image/webp"
          onChange={handleChange}
        />

        <div className="w-14 h-14 rounded-full bg-[#18181C] border border-[#282830] flex items-center justify-center mb-5 text-[#EAE8E2] group-hover:scale-105 transition-transform">
          <UploadCloud className="w-6 h-6 text-[#D8C7A5]" />
        </div>

        <div className="space-y-1.5 mb-5 pointer-events-none">
          <p className="text-[16px] font-medium text-[#EAE8E2]">
            Arrastra tu fotografía aquí
          </p>
          <p className="text-xs text-[#9E9C96]">
            o haz clic para explorar en tus archivos
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#EAE8E2] text-[#0A0A0B] text-xs font-semibold rounded-md pointer-events-none tracking-wide shadow-sm">
          <ImageIcon className="w-3.5 h-3.5" />
          Seleccionar fotografía
        </div>

        {/* SUPPORTED FORMATS BADGE */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[10px] text-[#686662] font-mono pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-[#161619] border border-[#222226]">JPG</span>
          <span className="px-2 py-0.5 rounded bg-[#161619] border border-[#222226]">PNG</span>
          <span className="px-2 py-0.5 rounded bg-[#161619] border border-[#222226]">WEBP</span>
          <span className="text-[#52504C] ml-1">· Procesamiento local en navegador</span>
        </div>
      </div>

      {/* ERROR FEEDBACK */}
      {errorMessage && (
        <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-900/50 px-4 py-2 rounded-md">
          {errorMessage}
        </div>
      )}

      {/* FEATURE PILLARS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-xl text-left">
        <div className="p-4 rounded-lg bg-[#111114] border border-[#1E1E22] space-y-1.5">
          <div className="flex items-center gap-2 text-[#D8C7A5] text-xs font-medium">
            <Film className="w-3.5 h-3.5" />
            <span>Encuadre Cinematográfico</span>
          </div>
          <p className="text-[11px] text-[#9E9C96] leading-normal">
            Formatos 2.39:1 Scope, 16:9, 4:5, 1:1 y 9:16 con modos Ajustar o Rellenar y bandas opcionales.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#111114] border border-[#1E1E22] space-y-1.5">
          <div className="flex items-center gap-2 text-[#D8C7A5] text-xs font-medium">
            <Sliders className="w-3.5 h-3.5" />
            <span>Gradación y Grano</span>
          </div>
          <p className="text-[11px] text-[#9E9C96] leading-normal">
            Estilos Cinema, Indie y Vintage con grano analógico orgánico y viñeta de lente.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#111114] border border-[#1E1E22] space-y-1.5">
          <div className="flex items-center gap-2 text-[#D8C7A5] text-xs font-medium">
            <Type className="w-3.5 h-3.5" />
            <span>Tipografía de Película</span>
          </div>
          <p className="text-[11px] text-[#9E9C96] leading-normal">
            Citas editoriales con atribución o subtítulos sincronizados con ajuste automático de líneas.
          </p>
        </div>
      </div>
    </div>
  );
}

