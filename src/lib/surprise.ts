import type { EditorState, CreativeProposal, Preset } from '@/types/editor';

/**
 * Variantes seleccionables para el Arquetipo 1: Nocturno & Claroscuro
 */
const NOCTURNE_VARIANTS: ReadonlyArray<Omit<CreativeProposal, 'id'>> = [
  {
    name: 'After Hours Nocturno',
    badge: 'Nocturno',
    description: 'Negros profundos, luces cálidas localizadas y resplandor suave de farolas.',
    settings: {
      preset: 'AFTER_HOURS' as Preset,
      presetIntensity: 95,
      exposure: -10,
      contrast: 20,
      saturation: -12,
      temperature: 12,
      highlights: 6,
      shadows: -30,
      grain: 8,
      vignette: 32,
      glowEnabled: true,
      glowIntensity: 42,
      glowRadius: 28,
      glowTone: 'warm',
    },
  },
  {
    name: 'Noir de Alto Contraste',
    badge: 'Monocromo',
    description: 'Monocromo elegante con resplandor difuso en las fuentes de luz.',
    settings: {
      preset: 'NOIR' as Preset,
      presetIntensity: 90,
      exposure: 0,
      contrast: 22,
      saturation: -100,
      temperature: 0,
      highlights: -8,
      shadows: -20,
      grain: 18,
      vignette: 24,
      glowEnabled: true,
      glowIntensity: 35,
      glowRadius: 22,
      glowTone: 'neutral',
    },
  },
  {
    name: 'Medianoche Cinematográfica',
    badge: 'Halation',
    description: 'Sombras densas con destellos rojizos tipo película analógica de 35 mm.',
    settings: {
      preset: 'AFTER_HOURS' as Preset,
      presetIntensity: 100,
      exposure: -14,
      contrast: 24,
      saturation: -16,
      temperature: 10,
      highlights: 8,
      shadows: -34,
      grain: 10,
      vignette: 35,
      glowEnabled: true,
      glowIntensity: 48,
      glowRadius: 30,
      glowTone: 'red',
    },
  },
];

/**
 * Variantes seleccionables para el Arquetipo 2: Analógico & Luz Natural
 */
const ANALOG_VARIANTS: ReadonlyArray<Omit<CreativeProposal, 'id'>> = [
  {
    name: '35mm Película Cálida',
    badge: 'Celuloide',
    description: 'Grano orgánico, contraste equilibrado y halo dorado en altas luces.',
    settings: {
      preset: 'FILM_35MM' as Preset,
      presetIntensity: 90,
      exposure: 0,
      contrast: 10,
      saturation: -6,
      temperature: 8,
      highlights: -12,
      shadows: 0,
      grain: 16,
      vignette: 10,
      glowEnabled: true,
      glowIntensity: 30,
      glowRadius: 20,
      glowTone: 'warm',
    },
  },
  {
    name: 'Golden Hour Crepuscular',
    badge: 'Luz Dorada',
    description: 'Atmósfera soleada de atardecer con resplandor ámbar envolvente.',
    settings: {
      preset: 'GOLDEN_HOUR' as Preset,
      presetIntensity: 95,
      exposure: 2,
      contrast: 8,
      saturation: 6,
      temperature: 18,
      highlights: -16,
      shadows: 4,
      grain: 8,
      vignette: 12,
      glowEnabled: true,
      glowIntensity: 38,
      glowRadius: 26,
      glowTone: 'warm',
    },
  },
  {
    name: 'Atmósfera Etérea',
    badge: 'Dreamy',
    description: 'Contraste suave, tonos apacibles y difusión óptica sutil.',
    settings: {
      preset: 'DREAMY' as Preset,
      presetIntensity: 85,
      exposure: 4,
      contrast: -10,
      saturation: -10,
      temperature: 4,
      highlights: 10,
      shadows: 8,
      grain: 6,
      vignette: 8,
      glowEnabled: true,
      glowIntensity: 32,
      glowRadius: 30,
      glowTone: 'neutral',
    },
  },
];

/**
 * Variantes seleccionables para el Arquetipo 3: Cine Indie & Crepúsculo
 */
const INDIE_VARIANTS: ReadonlyArray<Omit<CreativeProposal, 'id'>> = [
  {
    name: 'Indie Film Festival',
    badge: 'Cine de Autor',
    description: 'Colores desaturados, grano nostálgico y atmósfera intimista.',
    settings: {
      preset: 'INDIE' as Preset,
      presetIntensity: 90,
      exposure: 0,
      contrast: 14,
      saturation: -18,
      temperature: -6,
      highlights: -14,
      shadows: 0,
      grain: 16,
      vignette: 16,
      glowEnabled: true,
      glowIntensity: 26,
      glowRadius: 22,
      glowTone: 'warm',
    },
  },
  {
    name: 'Blue Hour Crepúsculo',
    badge: 'Crepúsculo',
    description: 'Tonos fríos y melancólicos con halo rojizo en las pocas luces activas.',
    settings: {
      preset: 'BLUE_HOUR' as Preset,
      presetIntensity: 90,
      exposure: -4,
      contrast: 8,
      saturation: -12,
      temperature: -20,
      highlights: -10,
      shadows: -14,
      grain: 10,
      vignette: 18,
      glowEnabled: true,
      glowTone: 'red',
      glowIntensity: 36,
      glowRadius: 24,
    },
  },
  {
    name: 'Cine Desaturado Sobrio',
    badge: 'Editorial',
    description: 'Paleta apagada con contraste moderado y foco en texturas.',
    settings: {
      preset: 'INDIE' as Preset,
      presetIntensity: 80,
      exposure: -2,
      contrast: 16,
      saturation: -28,
      temperature: -4,
      highlights: -18,
      shadows: -6,
      grain: 14,
      vignette: 14,
      glowEnabled: true,
      glowIntensity: 22,
      glowRadius: 18,
      glowTone: 'neutral',
    },
  },
];

/**
 * Genera exactamente tres propuestas creativas diversas combinando presets
 * y tratamientos estéticos existentes. Garantiza que las tres opciones
 * provienen de arquetipos visuales marcadamente diferentes.
 */
export function generateCreativeProposals(
  _currentState?: EditorState,
  iterationSeed: number = Date.now(),
): CreativeProposal[] {
  // Función determinista pero pseudoaleatoria para seleccionar variantes frescas
  const pick = <T>(array: ReadonlyArray<T>, seedOffset: number): T => {
    const idx = Math.floor(Math.abs(Math.sin(iterationSeed + seedOffset) * 10000)) % array.length;
    return array[idx];
  };

  const prop1 = pick(NOCTURNE_VARIANTS, 1);
  const prop2 = pick(ANALOG_VARIANTS, 2);
  const prop3 = pick(INDIE_VARIANTS, 3);

  return [
    {
      id: `prop-nocturne-${iterationSeed}`,
      ...prop1,
    },
    {
      id: `prop-analog-${iterationSeed}`,
      ...prop2,
    },
    {
      id: `prop-indie-${iterationSeed}`,
      ...prop3,
    },
  ];
}

/**
 * Aplica de forma segura los ajustes estéticos de una propuesta creativa
 * preservando absolutamente el encuadre, zoom, textos, autor, citas,
 * subtítulos, marcas de tiempo, créditos y bordes de la sesión activa.
 */
export function applyProposalSettings(
  currentState: EditorState,
  proposal: CreativeProposal,
): EditorState {
  const { settings } = proposal;
  return {
    ...currentState,
    preset: settings.preset ?? currentState.preset,
    presetIntensity: settings.presetIntensity ?? currentState.presetIntensity,
    exposure: settings.exposure ?? currentState.exposure,
    contrast: settings.contrast ?? currentState.contrast,
    saturation: settings.saturation ?? currentState.saturation,
    temperature: settings.temperature ?? currentState.temperature,
    highlights: settings.highlights ?? currentState.highlights,
    shadows: settings.shadows ?? currentState.shadows,
    grain: settings.grain ?? currentState.grain,
    vignette: settings.vignette ?? currentState.vignette,
    glowEnabled: settings.glowEnabled ?? currentState.glowEnabled,
    glowIntensity: settings.glowIntensity ?? currentState.glowIntensity,
    glowRadius: settings.glowRadius ?? currentState.glowRadius,
    glowTone: settings.glowTone ?? currentState.glowTone,
  };
}
