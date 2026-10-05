export interface CatalogOption {
  id: number;
  name: string;
  parentId?: number;
  parentName?: string;
}

export function catalogDisplayName(o: CatalogOption): string {
  const parent = o.parentName?.trim() ?? '';
  if (!parent || parent === o.name) return o.name;
  return `${parent} - ${o.name}`;
}

export function catalogOptionFromJson(json: Record<string, any>): CatalogOption {
  const parent = json.parent && typeof json.parent === 'object' ? json.parent : {};
  return {
    id: Math.trunc(Number(json.id)),
    name: json.name?.toString().trim() ?? '',
    parentId: json.parentId != null ? Math.trunc(Number(json.parentId)) : undefined,
    parentName: parent.name?.toString().trim(),
  };
}

export interface ExperienceCatalogs {
  departments: CatalogOption[];
  industries: CatalogOption[];
}
