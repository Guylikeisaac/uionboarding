import type { DeletableRecord } from './onboardingDraftStore';

/** Sentinel for "created, but the API returned no id". */
export const unknownRecordId = '__created__';

/** Keys for the flow's savedRecords map. */
export const SavedRecord = {
  experience: 'experience',
  education: 'education',
  internship: 'internship',
  project: (localId: string) => `project:${localId}`,
  kindOf(key: string): DeletableRecord {
    if (key === SavedRecord.education) return 'education';
    if (key === SavedRecord.experience || key === SavedRecord.internship) return 'experience';
    return 'project';
  },
};
