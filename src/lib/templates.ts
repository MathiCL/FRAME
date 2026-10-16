import { EditorState, TemplateId, TemplateValues } from '@/types/editor';

export interface TemplateDefinition {
  id: Exclude<TemplateId, 'CUSTOM'>;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  values: TemplateValues;
}

export const CINEMATIC_TEMPLATES: Record<Exclude<TemplateId, 'CUSTOM'>, TemplateDefinition> = {
  THE_QUOTE: {
    id: 'THE_QUOTE',
    name: 'The Quote',
    subtitle: 'Composición editorial',
    description: 'Cita con serif clásico, márgenes amplios y jerarquía visual equilibrada con atribución.',
    badge: 'Editorial',
    values: {
      textType: 'quote',
      textFont: 'serif',
      textAlign: 'center',
      textColor: '#F4EFE6',
      textSize: 36,
      textHorizontalPosition: 50,
      textVerticalPosition: 60,
      textOpacity: 100,
      textShadow: true,
      showAuthor: true,
      textBackground: false,
      textBackgroundColor: '#000000',
      textBackgroundOpacity: 70,
      textBackgroundRadius: 6,
      textBackgroundPaddingX: 18,
      textBackgroundPaddingY: 10,
    },
  },
  THE_SUBTITLE: {
    id: 'THE_SUBTITLE',
    name: 'The Subtitle',
    subtitle: 'Diálogo de cine',
    description: 'Subtítulo en el tercio inferior con banda oscura translúcida adaptativa para máxima legibilidad.',
    badge: 'Cine',
    values: {
      textType: 'subtitle',
      textFont: 'sans',
      textAlign: 'center',
      textColor: '#FFFFFF',
      textSize: 30,
      textHorizontalPosition: 50,
      textVerticalPosition: 86,
      textOpacity: 100,
      textShadow: true,
      showAuthor: false,
      textBackground: true,
      textBackgroundColor: '#000000',
      textBackgroundOpacity: 75,
      textBackgroundRadius: 4,
      textBackgroundPaddingX: 14,
      textBackgroundPaddingY: 6,
    },
  },
  THE_OPENING: {
    id: 'THE_OPENING',
    name: 'The Opening',
    subtitle: 'Título principal',
    description: 'Composición de gran tamaño inspirada en los títulos y carteles de autor en el centro del fotograma.',
    badge: 'Cartel',
    values: {
      textType: 'quote',
      textFont: 'sans',
      textAlign: 'center',
      textColor: '#F4EFE6',
      textSize: 50,
      textHorizontalPosition: 50,
      textVerticalPosition: 50,
      textOpacity: 95,
      textShadow: true,
      showAuthor: true,
      textBackground: false,
      textBackgroundColor: '#000000',
      textBackgroundOpacity: 70,
      textBackgroundRadius: 6,
      textBackgroundPaddingX: 16,
      textBackgroundPaddingY: 8,
    },
  },
  THE_DIARY: {
    id: 'THE_DIARY',
    name: 'The Diary',
    subtitle: 'Bitácora íntima',
    description: 'Texto discreto y personal con alineación izquierda cercano al margen seguro inferior.',
    badge: 'Íntimo',
    values: {
      textType: 'quote',
      textFont: 'mono',
      textAlign: 'left',
      textColor: '#E2D3B8',
      textSize: 24,
      textHorizontalPosition: 22,
      textVerticalPosition: 82,
      textOpacity: 90,
      textShadow: true,
      showAuthor: true,
      textBackground: false,
      textBackgroundColor: '#121215',
      textBackgroundOpacity: 65,
      textBackgroundRadius: 4,
      textBackgroundPaddingX: 12,
      textBackgroundPaddingY: 6,
    },
  },
  THE_MINIMAL: {
    id: 'THE_MINIMAL',
    name: 'The Minimal',
    subtitle: 'Espacio negativo',
    description: 'Texto contenido en el pie de imagen con amplio espacio negativo, dando total prioridad a la fotografía.',
    badge: 'Mínimo',
    values: {
      textType: 'quote',
      textFont: 'sans',
      textAlign: 'center',
      textColor: '#FFFFFF',
      textSize: 20,
      textHorizontalPosition: 50,
      textVerticalPosition: 88,
      textOpacity: 80,
      textShadow: true,
      showAuthor: false,
      textBackground: false,
      textBackgroundColor: '#000000',
      textBackgroundOpacity: 50,
      textBackgroundRadius: 4,
      textBackgroundPaddingX: 12,
      textBackgroundPaddingY: 6,
    },
  },
};

export const TEMPLATES_GALLERY_LIST: ReadonlyArray<TemplateDefinition> = [
  CINEMATIC_TEMPLATES.THE_QUOTE,
  CINEMATIC_TEMPLATES.THE_SUBTITLE,
  CINEMATIC_TEMPLATES.THE_OPENING,
  CINEMATIC_TEMPLATES.THE_DIARY,
  CINEMATIC_TEMPLATES.THE_MINIMAL,
];

/**
 * Applies a cinematic template to the current editor state.
 * Fully replaces previous typographic and layout settings in an idempotent manner,
 * while strictly preserving the user's custom photo, framing, color preset, and text content.
 */
export function applyTemplate(
  currentState: EditorState,
  templateId: TemplateId
): Partial<EditorState> {
  if (templateId === 'CUSTOM') {
    return { template: 'CUSTOM' };
  }

  const template = CINEMATIC_TEMPLATES[templateId];
  if (!template) return {};

  return {
    ...template.values,
    template: templateId,
    showText: true,
    // Strictly preserve user text and attribution
    text: currentState.text,
    textAuthor: currentState.textAuthor,
  };
}

/**
 * Returns user-facing localized display name for a template ID.
 */
export function getTemplateDisplayName(templateId?: TemplateId): string {
  if (!templateId) return 'Ninguna';
  if (templateId === 'CUSTOM') return 'Personalizado';
  return CINEMATIC_TEMPLATES[templateId]?.name ?? templateId;
}
