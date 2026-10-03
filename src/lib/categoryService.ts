import { CategoryDefinition, AssetCategory } from '../types';

export const STANDARD_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'industrial_machinery',
    name: 'Industrial Machinery',
    description: 'Heavy machinery, 5-axis CNCs, machining centers, hydraulic presses, automated manufacturing',
    color: 'blue',
    iconName: 'Wrench',
    isCustom: false,
  },
  {
    id: 'fleet_vehicle',
    name: 'Fleet Vehicles',
    description: 'Commercial transport, delivery vans, refrigerated logistics carriers, electric service vehicles',
    color: 'indigo',
    iconName: 'Truck',
    isCustom: false,
  },
  {
    id: 'it_computing',
    name: 'IT & Computing',
    description: 'Enterprise rack servers, cloud datacenter nodes, storage appliances, core network switches',
    color: 'cyan',
    iconName: 'Server',
    isCustom: false,
  },
  {
    id: 'medical_lab',
    name: 'Medical & Lab Equipment',
    description: 'Point-of-care ultrasound, clinical diagnostic analyzers, biometric patient telemetry systems',
    color: 'emerald',
    iconName: 'Activity',
    isCustom: false,
  },
  {
    id: 'facility_tooling',
    name: 'Facility Tooling & Standards',
    description: 'Traceable metrology standards, electrical calibrators, HVAC chillers, backup plant units',
    color: 'amber',
    iconName: 'Sliders',
    isCustom: false,
  },
];

const LOCAL_STORAGE_KEY = 'iso55001_custom_categories';

/**
 * Loads custom categories from local storage.
 */
export function getCustomCategories(): CategoryDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse custom categories from localStorage:', err);
    return [];
  }
}

/**
 * Returns all categories (Standard + Custom).
 */
export function getAllCategories(): CategoryDefinition[] {
  const custom = getCustomCategories();
  // Merge, avoiding duplicates by id
  const seenIds = new Set(STANDARD_CATEGORIES.map(c => c.id));
  const merged = [...STANDARD_CATEGORIES];
  for (const c of custom) {
    if (!seenIds.has(c.id)) {
      merged.push(c);
      seenIds.add(c.id);
    }
  }
  return merged;
}

/**
 * Saves a new custom category.
 */
export async function addCustomCategory(newCategory: {
  name: string;
  description?: string;
  color?: string;
}): Promise<CategoryDefinition> {
  const trimmedName = newCategory.name.trim();
  if (!trimmedName) {
    throw new Error('Category name cannot be empty');
  }

  // Generate safe slug id
  const slugId = trimmedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `cat_${Date.now()}`;

  const categoryDef: CategoryDefinition = {
    id: slugId,
    name: trimmedName,
    description: newCategory.description?.trim() || 'Custom registered enterprise asset category',
    color: newCategory.color || 'purple',
    iconName: 'Tag',
    isCustom: true,
  };

  // 1. Save locally in localStorage
  if (typeof window !== 'undefined') {
    const current = getCustomCategories();
    const existingIndex = current.findIndex(c => c.id === slugId);
    if (existingIndex >= 0) {
      current[existingIndex] = categoryDef;
    } else {
      current.push(categoryDef);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  }

  // 2. Also attempt to sync to backend /api/categories if available
  try {
    fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryDef),
    }).catch(() => {
      // offline or silent fail
    });
  } catch {
    // ignore
  }

  return categoryDef;
}

/**
 * Formats any category key into a human-friendly label.
 */
export function formatCategoryName(categoryKey?: string): string {
  if (!categoryKey) return 'General Asset';
  const all = getAllCategories();
  const match = all.find(c => c.id.toLowerCase() === categoryKey.toLowerCase());
  if (match) return match.name;

  // Otherwise replace underscores with spaces and capitalize words
  return categoryKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Returns badge styling classes for a category.
 */
export function getCategoryBadgeStyle(categoryKey?: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const all = getAllCategories();
  const match = all.find(c => c.id.toLowerCase() === categoryKey?.toLowerCase());
  const color = match?.color || 'slate';

  switch (color) {
    case 'blue':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
    case 'indigo':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' };
    case 'cyan':
      return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' };
    case 'emerald':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
    case 'amber':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
    case 'purple':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' };
    case 'rose':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' };
    case 'teal':
      return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' };
    default:
      return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' };
  }
}
