export interface LocationResult {
  id: string;
  city: string;
  state: string;
  country: string;
  label: string;
}

export function locationResultFromJson(json: Record<string, any>): LocationResult {
  return {
    id: typeof json.id === 'string' ? json.id : '',
    city: typeof json.city === 'string' ? json.city : '',
    state: typeof json.state === 'string' ? json.state : '',
    country: typeof json.country === 'string' ? json.country : '',
    label: typeof json.label === 'string' ? json.label : '',
  };
}
