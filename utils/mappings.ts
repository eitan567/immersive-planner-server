export const VALID_POSITION_TYPES = {
  'פתיחת נושא': 'opening',
  'הקנייה': 'teaching',
  'תרגול': 'practice',
  'סיכום נושא': 'summary'
} as const;

export const VALID_SPACE_USAGE = {
  'מליאה': 'whole',
  'עבודה בקבוצות': 'groups',
  'עבודה אישית': 'individual',
  'משולב': 'mixed'
} as const;

export const VALID_SCREEN_TYPES = {
  'סרטון': 'video',
  'תמונה': 'image',
  'פדלט': 'padlet',
  'אתר': 'website',
  'ג\'ניאלי': 'genially',
  'מצגת': 'presentation'
} as const;

export function mapPositionToEnglish(hebrewValue: string): string {
  return VALID_POSITION_TYPES[hebrewValue as keyof typeof VALID_POSITION_TYPES] || hebrewValue;
}

export function mapSpaceUsageToEnglish(hebrewValue: string): string {
  return VALID_SPACE_USAGE[hebrewValue as keyof typeof VALID_SPACE_USAGE] || hebrewValue;
}

export const VALID_CATEGORIES = {
  'מתמטיקה': 'mathematics',
  'אנגלית': 'english',
  'עברית': 'hebrew',
  'תנ״ך': 'bible',
  'היסטוריה': 'history',
  'אזרחות': 'civics',
  'ספרות': 'literature',
  'פיזיקה': 'physics',
  'כימיה': 'chemistry',
  'ביולוגיה': 'biology',
  'מדעים': 'science',
  'גיאוגרפיה': 'geography',
  'מחשבים': 'computers',
  'אומנות': 'art',
  'מוזיקה': 'music',
  'חינוך גופני': 'physical_education',
  'פילוסופיה': 'philosophy',
  'פסיכולוגיה': 'psychology',
  'סוציולוגיה': 'sociology',
  'חינוך חברתי': 'social_education'
} as const;

export function mapScreenTypeToEnglish(hebrewValue: string): string {
  return VALID_SCREEN_TYPES[hebrewValue as keyof typeof VALID_SCREEN_TYPES] || hebrewValue;
}

export function mapCategoryToEnglish(hebrewValue: string): string {
  return VALID_CATEGORIES[hebrewValue as keyof typeof VALID_CATEGORIES] || hebrewValue;
}
