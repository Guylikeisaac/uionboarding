import type { LocationResult } from './models/locationResult';
import { onboardingRepository } from './onboardingRepository';

/**
 * Job-title suggestions. Failures return an empty list: a suggestion outage
 * must not block a field where free text is a valid answer.
 */
export async function searchJobTitles(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    return await onboardingRepository.searchJobTitles(q);
  } catch {
    return [];
  }
}

/** Location search, with a small offline fallback list. */
export async function searchLocations(query: string): Promise<LocationResult[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const live = await onboardingRepository.searchLocations(q);
    if (live.length) return live;
  } catch {
    // fall through
  }
  return offlineFallback(q);
}

function seed(city: string, state: string): LocationResult {
  return { id: `offline:${city.toLowerCase()}`, city, state, country: 'India', label: state ? `${city}, ${state}` : city };
}

const seedCities: LocationResult[] = [
  seed('Bengaluru', 'Karnataka'),
  seed('Mumbai', 'Maharashtra'),
  seed('Pune', 'Maharashtra'),
  seed('Delhi', 'Delhi'),
  seed('Gurugram', 'Haryana'),
  seed('Noida', 'Uttar Pradesh'),
  seed('Hyderabad', 'Telangana'),
  seed('Chennai', 'Tamil Nadu'),
  seed('Kolkata', 'West Bengal'),
  seed('Ahmedabad', 'Gujarat'),
  seed('Jaipur', 'Rajasthan'),
  seed('Indore', 'Madhya Pradesh'),
  seed('Chandigarh', 'Chandigarh'),
  seed('Kochi', 'Kerala'),
  seed('Bhopal', 'Madhya Pradesh'),
  seed('Remote', ''),
  seed('India', ''),
];

function offlineFallback(query: string): LocationResult[] {
  const q = query.toLowerCase();
  return seedCities.filter(
    (c) => c.city.toLowerCase().includes(q) || c.state.toLowerCase().includes(q) || c.country.toLowerCase().includes(q),
  );
}
