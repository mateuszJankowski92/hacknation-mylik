// Dopasowanie twierdzeń do bazy znanych incydentów dezinformacyjnych.
// Wynik trafia WYŁĄCZNIE do `notices` (typ `dopasowanie_incydentu`): nigdy nie zmienia werdyktu,
// siły ani dowodów. Silnik zna tylko interfejs `IncidentMatcher` (wstrzykiwany w zależnościach);
// adapter poniżej opakowuje `matchIncidents` z src/corpus/incidents.
import type { ExtractedClaim } from '../contracts/index';
import { findIncidentsFile, loadIncidentsFile, matchIncidents, type IncidentRecord } from '../corpus/incidents/index';

export interface IncidentHit {
  /** Neutralny tekst ostrzeżenia (z bazy incydentów, nie od modelu). */
  text: string;
}

export interface IncidentMatcher {
  match(claim: Pick<ExtractedClaim, 'text' | 'searchTerms'>, now: Date): IncidentHit[] | Promise<IncidentHit[]>;
}

export const MAX_INCIDENT_NOTICES = 3;

export function incidentMatcherFromRecords(records: IncidentRecord[]): IncidentMatcher {
  return {
    match: (claim, now) => matchIncidents(claim, records, { now, limit: MAX_INCIDENT_NOTICES }),
  };
}

/** Wczytuje bazę incydentów z pliku (ścieżka jawna albo domyślne wyszukiwanie); brak = null. */
export function loadIncidentMatcher(path?: string): IncidentMatcher | null {
  try {
    const file = path ?? findIncidentsFile();
    if (!file) return null;
    const { records } = loadIncidentsFile(file);
    return records.length ? incidentMatcherFromRecords(records) : null;
  } catch {
    return null;
  }
}
