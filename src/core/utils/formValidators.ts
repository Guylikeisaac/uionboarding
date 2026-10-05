/**
 * Reusable form validators. Every method returns `null` on success or a
 * non-empty error message on failure.
 */
type V = string | null | undefined;

export const FormValidators = {
  requiredField(value: V): string | null {
    if (value == null || value.trim().length === 0) return 'This field is required.';
    return null;
  },

  /** Letters (incl. accents / Devanagari), spaces, hyphens, apostrophes. */
  personName(value: V): string | null {
    const r = FormValidators.requiredField(value);
    if (r) return r;
    const t = value!.trim();
    if (t.length < 2) return 'Name must be at least 2 characters.';
    if (t.length > 80) return 'Name must be 80 characters or fewer.';
    if (!/^[\p{L}\p{M}\s'\-]+$/u.test(t)) return 'Name contains invalid characters.';
    return null;
  },

  email(value: V): string | null {
    const r = FormValidators.requiredField(value);
    if (r) return r;
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(value!.trim())) {
      return 'Enter a valid email address.';
    }
    return null;
  },

  optionalEmail(value: V): string | null {
    if (value == null || value.trim().length === 0) return null;
    return FormValidators.email(value);
  },

  /** 10-digit Indian mobile number (optionally prefixed with +91 or 0). */
  indianPhoneNumber(value: V): string | null {
    const r = FormValidators.requiredField(value);
    if (r) return r;
    const digits = value!.replace(/[\s\-]/g, '');
    if (!/^(\+91|0)?[6-9]\d{9}$/.test(digits)) return 'Enter a valid 10-digit Indian mobile number.';
    return null;
  },

  /** Validates a numeric OTP of a given [length] (default 6). */
  otp(length = 6) {
    return (value: V): string | null => {
      const r = FormValidators.requiredField(value);
      if (r) return r;
      const d = value!.trim();
      if (d.length !== length || !/^\d+$/.test(d)) return `Enter the ${length}-digit code.`;
      return null;
    };
  },

  bioMinLength: 30,
  bioMaxLength: 300,
  projectDescriptionMinLength: 20,
  projectDescriptionMaxLength: 300,

  /** Optional, but when provided must be [bioMinLength]–[bioMaxLength] chars. */
  bio(value: V): string | null {
    if (value == null || value.trim().length === 0) return null;
    const t = value.trim();
    if (t.length < FormValidators.bioMinLength) return `Bio should be at least ${FormValidators.bioMinLength} characters.`;
    if (t.length > FormValidators.bioMaxLength) return `Bio must be ${FormValidators.bioMaxLength} characters or fewer.`;
    return null;
  },

  projectDescription(value: V): string | null {
    if (value == null || value.trim().length === 0) return 'Add a project description to continue.';
    const t = value.trim();
    if (t.length < FormValidators.projectDescriptionMinLength) {
      return `Project description should be at least ${FormValidators.projectDescriptionMinLength} characters.`;
    }
    if (t.length > FormValidators.projectDescriptionMaxLength) {
      return `Project description must be ${FormValidators.projectDescriptionMaxLength} characters or fewer.`;
    }
    return null;
  },

  cityName(value: V): string | null {
    const r = FormValidators.requiredField(value);
    if (r) return r;
    const t = value!.trim();
    if (t.length < 2) return 'City name must be at least 2 characters.';
    if (t.length > 60) return 'City name must be 60 characters or fewer.';
    if (!/^[\p{L}\p{M}\s'\-,.]+$/u.test(t)) return 'City name contains invalid characters.';
    return null;
  },

  /** Optional URL; requires http:// or https:// when provided. */
  url(value: V): string | null {
    if (value == null || value.trim().length === 0) return null;
    if (!/^https?:\/\/(([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,})(:\d+)?(\/[^\s]*)?$/.test(value.trim())) {
      return 'Enter a valid URL (starting with http:// or https://).';
    }
    return null;
  },

  /** Like [url] but the scheme is optional ("github.com/username"). */
  webAddress(value: V): string | null {
    if (value == null || value.trim().length === 0) return null;
    if (!/^(https?:\/\/)?(([a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,})(:\d+)?([/?#][^\s]*)?$/.test(value.trim())) {
      return 'Enter a valid link (e.g. https://example.com).';
    }
    return null;
  },

  /** Prefixes `https://` when the value has no scheme. */
  normalizeUrl(value: string): string {
    const v = value.trim();
    if (!v) return v;
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    const half = /^(https?):\/(?!\/)/i;
    if (half.test(v)) return v.replace(half, (_m, s: string) => `${s}://`);
    if (/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(v)) return v;
    return `https://${v}`;
  },

  /** Optional 4-digit year between 1950 and next year. */
  optionalYear(value: V): string | null {
    if (value == null || value.trim().length === 0) return null;
    const v = value.trim();
    const year = /^\d+$/.test(v) ? parseInt(v, 10) : NaN;
    const now = new Date().getFullYear();
    if (v.length !== 4 || Number.isNaN(year)) return `Enter a 4-digit year (e.g. ${now}).`;
    if (year < 1950 || year > now + 1) return `Enter a year between 1950 and ${now + 1}.`;
    return null;
  },

  /** Optional CTC amount in LPA. */
  optionalCtcLpa(value: V): string | null {
    if (value == null || value.trim().length === 0) return null;
    const amount = Number(value.trim());
    if (!Number.isFinite(amount)) return 'Enter a number (e.g. 12 or 12.5).';
    if (amount < 0) return "CTC can't be negative.";
    if (amount > 1000) return 'Enter the amount in LPA (e.g. 12), not rupees.';
    return null;
  },

  jobRole(value: V): string | null {
    const r = FormValidators.requiredField(value);
    if (r) return r;
    const t = value!.trim();
    if (t.length < 2) return 'Role must be at least 2 characters.';
    if (t.length > 80) return 'Role must be 80 characters or fewer.';
    return null;
  },
};
