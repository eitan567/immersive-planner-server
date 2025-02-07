export interface PromptConfig {
  context: string;
  variables: Record<string, string | undefined>;
}

export function generateSuggestionPrompt(config: {
  context: string;
  currentValue: string;
  message?: string;
  type: 'topic' | 'content' | 'goals' | 'duration' | 'activity';
}): string {
  let prompt = `בהתבסס על ההקשר הבא: "${config.context}"
והתוכן הנוכחי: "${config.currentValue || "ריק"}"`;

  if (config.message) {
    prompt += `\nבהתייחס להודעה הבאה: "${config.message}"`;
  }
  prompt += "\n\n";

  switch (config.type) {
    case "topic":
      prompt += "הצע נושא יחידה מתאים שיתאים להוראה בחדר אימרסיבי.";
      break;
    case "content":
      prompt += "הצע תיאור מפורט לפעילות לימודית שתתאים לחדר אימרסיבי.";
      break;
    case "goals":
      prompt += "הצע מטרות למידה ספציפיות ומדידות.";
      break;
    case "duration":
      prompt += "הצע משך זמן מתאים לפעילות זו, תוך התחשבות באופי הפעילות וקהל היעד.";
      break;
    case "activity":
      prompt += "הצע פעילות לימודית שתנצל את היכולות הייחודיות של החדר האימרסיבי.";
      break;
    default:
      prompt += "הצע שיפור או חלופה לתוכן הנוכחי.";
      break;
  }

  return prompt;
}

export function generateUpdatePrompt(config: {
  message: string;
  currentValues: Record<string, string>;
  fieldLabels: Record<string, string>;
}): string {
  const fieldsContext = Object.entries(config.fieldLabels)
    .map(([key, label]) => {
      const value = config.currentValues?.[key];
      return `${label}: ${value || '(ריק)'}`;
    })
    .join('\n');

  const fieldsMapping = Object.entries(config.fieldLabels)
    .map(([key, label]) => `"${label}": "${key}"`)
    .join('\n');

  return `אתה עוזר למורים לשפר את תוכן השיעור שלהם.

[הנחיות חובה]

משימתך מתחלקת לשני סוגי שדות:
1. פרטי השיעור (נושא, זמן, מטרות וכו')
2. בניית השיעור (פתיחה, גוף, סיכום - כל אחד כולל תוכן ושימוש במרחב)

כללי הטיפול בשדות:

1. כשנאמר "הצע ערכים לכל השדות":
   - חובה לעדכן את כל השדות בלי יוצא מן הכלל!
   - גם שדות ריקים וגם שדות מלאים
   - גם פרטי השיעור וגם בניית השיעור
   - תן תוכן מפורט וחדש לכל שדה

2. כשנאמר "מלא שדות ריקים":
   - עדכן רק שדות המסומנים (ריק)
   - אל תיגע בשדות מלאים

3. חובה להוסיף תגית UI בסוף כל תשובה:
   - פרטי שיעור: "<שדה: נושא היחידה>"
   - בניית שיעור: "<שדה: פתיחה - תוכן/פעילות>"

4. הנחיות לבניית השיעור:
   בכל תוכן פעילות יש לפרט:
   - מה התלמידים עושים
   - איך משתמשים במסכים
   - איך מאורגן המרחב
   - מה המורה עושה

[מיפוי שדות]
${fieldsMapping}

[מצב נוכחי של השדות]
${fieldsContext}

[בקשת המשתמש]
${config.message}

חובה להחזיר אך ורק מערך JSON בפורמט הבא (כולל המבנה המדויק של הסוגריים):

[
  {
    "fieldToUpdate": "duration",
    "userResponse": "הסבר על השינוי",
    "newValue": "ערך מדויק"
  }
]

אם אתה משנה מספר שדות, צריך להיות בדיוק כך:

[
  {
    "fieldToUpdate": "duration",
    "userResponse": "הסבר על השינוי",
    "newValue": "ערך מדויק"
  },
  {
    "fieldToUpdate": "gradeLevel",
    "userResponse": "הסבר על השינוי",
    "newValue": "ערך מדויק"
  }
]

דוגמה לתשובה מלאה:
[
  {
    "fieldToUpdate": "topic",
    "userResponse": "עדכנתי את נושא היחידה לנושא מרתק המתאים במיוחד לחדר האימרסיבי <שדה: נושא היחידה>",
    "newValue": "מסע אל מערכת השמש - חקר כוכבי הלכת בסביבה אימרסיבית"
  },
  {
    "fieldToUpdate": "opening.0.content",
    "userResponse": "הוספתי פעילות פתיחה שמנצלת את המסכים והחלל באופן מיטבי <שדה: פתיחה - תוכן/פעילות>",
    "newValue": "התלמידים נכנסים לחדר חשוך כשעל שלושת המסכים מוקרנים שמי הלילה מזוויות שונות. המורה מציגה שאלה מעוררת חשיבה על המסך המרכזי: 'מה קורה לכוכבים ביום?' התלמידים מתפזרים בחלל ורושמים את השערותיהם על טאבלטים."
  }
]

חובה:
1. השתמש רק במפתחות הטכניים שמופיעים במיפוי למעלה (כמו "duration", לא "זמן כולל")
2. תמיד תחזיר מערך שמתחיל ב-[ ומסתיים ב-], גם אם יש רק פריט אחד
3. וודא שהפסיקים והרווחים בדיוק כמו בדוגמה (2 רווחים להזחה)
4. אסור להוסיף טקסט מחוץ ל-JSON

חשוב: 
- הערך של "newValue" חייב להיות טקסט ולא מערך של טקסטים
- הערך ב-newValue חייב להיות הערך הסופי והמלא, לא תבנית
- אל תשתמש בסימני [] או תבניות למילוי
- תן ערך מוחלט ומלא שמתאים לשדה`;
}

export function generateChatPrompt(config: {
  message: string;
  currentValues: Record<string, string>;
  fieldLabels?: Record<string, string>;
  history: Array<{ text: string; sender: 'user' | 'ai'; timestamp: Date }>;
}): string {
  const contextSection = Object.entries(config.currentValues)
    .map(([key, value]) => {
      const label = config.fieldLabels?.[key] || key;
      return `${label}: ${value || '(ריק)'}`;
    })
    .join('\n');

  const historySection = config.history
    .map(msg => `${msg.sender === 'user' ? 'משתמש' : 'מערכת'}: ${msg.text}`)
    .join('\n');

  return `אתה עוזר למורים לתכנן שיעורים בחדר אימרסיבי.

[מצב נוכחי של השיעור]
${contextSection}

[היסטוריית השיחה]
${historySection}

[הנחיות]
1. אתה יועץ מומחה בתחום החינוך עם התמחות בהוראה בחדר אימרסיבי
2. התייחס לתוכן השיעור ולערכים הנוכחיים בתשובותיך
3. כשהמשתמש שואל שאלה, תן תשובה מפורטת ומקצועית
4. כשהמשתמש מבקש רעיונות, הצע רעיונות מעשיים שמתאימים לחדר אימרסיבי
5. שמור על שיחה טבעית ומקצועית
6. יש לענות במשפטים קצרים אלא אם המשתמש ביקש לפרט יותר או להאריך בתשובות שלך

[בקשת המשתמש]
${config.message}

ענה בצורה מקצועית, תוך התייחסות להקשר השיעור. אל תציין שאתה AI, פשוט ענה כמומחה מקצועי.`;
}