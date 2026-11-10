export interface PackageCategory {
  value: string;
  label: string;
}

export const PACKAGE_CATEGORIES: PackageCategory[] = [
  { value: 'documents', label: 'Documents & Papiers' },
  { value: 'vetements', label: 'Vêtements & Textile' },
  { value: 'vivres', label: 'Vivres secs' },
  { value: 'high-tech', label: 'High-tech inspecté' },
  { value: 'cadeaux', label: 'Cadeaux sous emballage ouvert' },
  { value: 'medicaments', label: 'Médicaments avec ordonnance' },
  { value: 'autre', label: 'Autre' },
];

export const DEFAULT_ACCEPTED_CATEGORIES = PACKAGE_CATEGORIES.map((category) => category.value);

export function getCategoryLabel(value: string): string {
  return PACKAGE_CATEGORIES.find((category) => category.value === value)?.label ?? value;
}
