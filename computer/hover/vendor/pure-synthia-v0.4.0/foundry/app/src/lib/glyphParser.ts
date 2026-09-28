import type { Fragment } from '../types';

export interface ParsedGlyphMetadata {
  glyph?: string;
  type?: string;
  quality?: 'draft' | 'tested' | 'production' | 'archived';
  origin?: string;
  source?: string;
  created?: string;
  tags?: string[];
  intent?: string;
  locked?: boolean;
}

/**
 * Parses Foundry glyph metadata from file content
 * Supports JS-style, CSS-style, HTML-style, and generic comments
 */
export function parseGlyphMetadata(content: string): ParsedGlyphMetadata | null {
  const metadata: ParsedGlyphMetadata = {};
  
  // Regex patterns for different comment styles
  const patterns = [
    // JS-style: // @foundry-key: value
    /@foundry-(\w+):\s*(.+)/g,
    // CSS-style: * @foundry-key: value
    /\*\s*@foundry-(\w+):\s*(.+)/g,
    // HTML-style: @foundry-key: value
    /@foundry-(\w+):\s*(.+)/g,
  ];

  let foundMetadata = false;

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      foundMetadata = true;
      const key = match[1];
      const value = match[2].trim();

      switch (key) {
        case 'glyph':
          metadata.glyph = value;
          break;
        case 'type':
          metadata.type = value;
          break;
        case 'quality':
          if (['draft', 'tested', 'production', 'archived'].includes(value)) {
            metadata.quality = value as ParsedGlyphMetadata['quality'];
          }
          break;
        case 'origin':
          metadata.origin = value;
          break;
        case 'source':
          metadata.source = value;
          break;
        case 'created':
          metadata.created = value;
          break;
        case 'tags':
          metadata.tags = value.split(',').map(t => t.trim());
          break;
        case 'intent':
          metadata.intent = value;
          break;
        case 'locked':
          metadata.locked = value.toLowerCase().includes('true');
          break;
      }
    }
  }

  return foundMetadata ? metadata : null;
}

/**
 * Strips Foundry metadata comments from content
 * Useful for getting clean code without metadata headers
 */
export function stripGlyphMetadata(content: string): string {
  // Remove the entire metadata block
  const patterns = [
    // JS-style block
    /\/\/ ═+[\s\S]*?\/\/ FOUNDRY METADATA[\s\S]*?\/\/ ═+\n\n?/,
    // CSS-style block
    /\/\*[\s\S]*?FOUNDRY METADATA[\s\S]*?\*\/\n\n?/,
    // HTML-style block
    /<!--[\s\S]*?FOUNDRY METADATA[\s\S]*?-->\n\n?/,
    // Generic block
    /# ═+[\s\S]*?# FOUNDRY METADATA[\s\S]*?# ═+\n\n?/,
  ];

  let result = content;
  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }

  return result;
}

/**
 * Merges parsed metadata with new fragment
 * Preserves glyph and metadata when re-importing
 */
export function mergeGlyphMetadata(
  fragment: Fragment,
  parsed: ParsedGlyphMetadata | null
): Fragment {
  if (!parsed) return fragment;

  return {
    ...fragment,
    glyph: parsed.glyph || fragment.glyph,
    type: parsed.type || fragment.type,
    metadata: {
      ...fragment.metadata,
      quality: parsed.quality || fragment.metadata.quality,
      origin: parsed.origin || fragment.metadata.origin,
      qualityLocked: parsed.locked || fragment.metadata.qualityLocked,
      tags: parsed.tags || fragment.metadata.tags,
      detectedIntent: parsed.intent || fragment.metadata.detectedIntent,
    }
  };
}
