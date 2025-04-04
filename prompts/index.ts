// import { VALID_POSITION_TYPES, VALID_SPACE_USAGE, VALID_SCREEN_TYPES } from '../utils/mappings';

export interface PromptConfig {
  context: string;
  variables: Record<string, string | undefined>;
}

export interface GenerateFullLessonArgs {
  topic?: string;
  materials?: { title: string; content: string } | string;
  category?: string;
  fieldLabels: Record<string, string>;
}

export function generateSuggestionPrompt(config: {
  materials?: { title: string; content: string } | string;
  context: string;
  currentValue: string;
  message?: string;
  type: 'topic' | 'content' | 'goals' | 'duration' | 'activity' | 'position' | 'contentGoals' | 'skillGoals' | 'priorKnowledge' | 'gradeLevel' | 'category' | 'description';
}): string {

  //add log to all the fields
  console.log('generateSuggestionPrompt config:', config);
  console.log('generateSuggestionPrompt config context:', config.context);
  console.log('generateSuggestionPrompt config currentValue:', config.currentValue);
  console.log('generateSuggestionPrompt config message:', config.message);
  console.log('generateSuggestionPrompt config type:', config.type);
  console.log('generateSuggestionPrompt config materials:', config.materials);

  let prompt = `בהתבסס על ההקשר הבא: "${config.context}"
`;

  if (config.materials) {
    const materialsText = typeof config.materials === 'string' ? config.materials : `${config.materials.title}\n${config.materials.content}`;
    prompt += `\nוחומרי העזר הבאים:\n${materialsText}`;
  }

  prompt += `\nוהתוכן הנוכחי: "${config.currentValue || "ריק"}"`;

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
    case "contentGoals":
      prompt += "הצע מטרות למידה ספציפיות ומדידות ברמת התוכן.";
      break;
    case "skillGoals":
      prompt += "הצע מטרות למידה ספציפיות ומדידות ברמת המיומנויות.";
      break;
    case "priorKnowledge":
      prompt += "הצע ידע קודם נדרש לפעילות זו.";
      break;
    case "gradeLevel":
      prompt += "הצע שכבת גיל מתאימה לפעילות זו.";
      break;
    case "duration":
      prompt += "הצע משך זמן מתאים לפעילות זו, תוך התחשבות באופי הפעילות וקהל היעד.";
      break;
    case "activity":
      prompt += "הצע פעילות לימודית שתנצל את היכולות הייחודיות של החדר האימרסיבי.";
      break;
    case "position":
      prompt += `חובה לבחור ערך אחד בדיוק מתוך האפשרויות הבאות בלבד:
                  * פתיחת נושא
                  * הקנייה
                  * תרגול
                  * סיכום נושא

                  אסור להציע ערכים אחרים! חובה לבחור מהרשימה הזו בדיוק.`;
      break;
    case "category":
      prompt += `חובה לבחור ערך אחד בדיוק מתוך האפשרויות הבאות בלבד:
                * מתמטיקה
                * אנגלית
                * עברית
                * תנ״ך
                * היסטוריה
                * אזרחות
                * ספרות
                * פיזיקה
                * כימיה
                * ביולוגיה
                * מדעים
                * גיאוגרפיה
                * מחשבים
                * אומנות
                * מוזיקה
                * חינוך גופני
                * פילוסופיה
                * פסיכולוגיה
                * סוציולוגיה
                * חינוך חברתי
                * טכנולוגיה
                * כלכלה
                * סטטיסטיקה
                * פיננסים
                * מנהיגות
                * תקשורת
                * ארכיטקטורה
                * עיצוב
                * פיתוח תוכנה
                * בינה מלאכותית
                * אבטחת מידע

                אסור להציע ערכים אחרים! חובה לבחור מהרשימה הזו בדיוק.`;
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
  materials?: { title: string; content: string } | string;
}): string {

  //add log to all the fields
  console.log('generateUpdatePrompt config:', config);
  console.log('generateUpdatePrompt config message:', config.message);
  console.log('generateUpdatePrompt config currentValues:', config.currentValues);
  console.log('generateUpdatePrompt config fieldLabels:', config.fieldLabels);
  console.log('generateUpdatePrompt config materials:', config.materials);

  let materialsContext = '';
  if (config.materials) {
    materialsContext = '\n[חומרי עזר]\n';
    if (typeof config.materials === 'object' && config.materials.title && config.materials.content) {
      materialsContext += `כותרת: ${config.materials.title}\nתוכן: ${config.materials.content}`;
    } else {
      materialsContext += config.materials;
    }
  }

  const fieldsContext = Object.entries(config.fieldLabels)
    .map(([key, label]) => {
      const value = config.currentValues?.[key];
      return `${label}: ${value || '(ריק)'}`;
    })
    .join('\n');

  const fieldsMapping = Object.entries(config.fieldLabels)
    .map(([key, label]) => `"${label}": "${key}"`)
    .join('\n');

  const originalPrompt=`    
     STRICT INSTRUCTION: 
        Answer must ***ONLY*** be in HEBREW! NO other languages allowed!
        You must respond with a single array of JSON objects. 
        The JSON objects must contain exactly these 3 fields: 'field', 'chat', 'value'. 
        Do not include any other text. Do not explain. Do not acknowledge. 
        Format: {'field': '', 'chat': '', 'value': ''}
        there must be a tag like "<שדה: נושא היחידה>" at the end of each chat message that describes the field.
        if the user asks to update the category, you must choose a category from the list and update the 'category' field only.
        אם המשתמש מבקש לעדכן את כל השדות והשדה קטגוריה ריק ,עלייך לבחור מאחת הקטגוריות המוגדרות באופן אקראי ולמלא את כול השדות לפיה. אבל אם יש ערך בקטגוריה יש לבחור קטגוריה ולהשלים את השדות בהתאם.
        

        THREE VERY IMPORTANT RULES !!!
          If the user asks to update a SEPCIFIC field, you MUST update that field ONLY !!!!
          if the user asks you to update all fields, you must update all fields - meaning all fields in the lesson plan MUST be updated.
          if the user asks you to update the 'נושא היחידה' field and the category field is full, you must update the 'נושא היחידה' according to the selected category.
          אם המשתמש מבקש לעדכן את השדה 'נושא היחידה' והשדה קטגוריה מלא, עליך לעדכן את 'נושא היחידה' לפי הקטגוריה שנבחרה.
          
      אתה עוזר למורים לשפר את תוכן השיעור שלהם בנושא יצירה של חדר אמרסיבי.

      הנחיות חשובות לגבי הקטגוריה:
      1. כשהמשתמש מבקש לעדכן או להתאים את הקטגוריה לנושא היחידה, עליך לבחור קטגוריה מתאימה מהרשימה המוגדרת ולעדכן את שדה ה-category.
      2. יש לבחור את הקטגוריה המתאימה ביותר לנושא היחידה, אך אין לשנות את נושא היחידה עצמו.
      3. הקטגוריה חייבת להיות אחת מהאפשרויות הבאות:
          * מתמטיקה
          * אנגלית
          * עברית
          * תנ״ך
          * היסטוריה
          * אזרחות
          * ספרות
          * פיזיקה
          * כימיה
          * ביולוגיה
          * מדעים
          * גיאוגרפיה
          * מחשבים
          * אומנות
          * מוזיקה
          * חינוך גופני
          * פילוסופיה
          * פסיכולוגיה
          * סוציולוגיה
          * חינוך חברתי
          * טכנולוגיה
          * כלכלה
          * סטטיסטיקה
          * פיננסים
          * מנהיגות
          * תקשורת
          * ארכיטקטורה
          * עיצוב
          * פיתוח תוכנה
          * בינה מלאכותית
          * אבטחת מידע
        
      [הנחיות חובה]

      משימתך מתחלקת לשני סוגי שדות:  

      1. פרטי השיעור הכוללים את השדות (משני סוגים: טקסט, תיבות בחירה): 
        - קטגוריה (תיבת בחירה עם האפשרויות הבאות: מתמטיקה, אנגלית, עברית, תנ״ך, היסטוריה, אזרחות, ספרות, פיזיקה, כימיה, ביולוגיה, מדעים, גיאוגרפיה, מחשבים, אומנות, מוזיקה, חינוך גופני, פילוסופיה, פסיכולוגיה, סוציולוגיה, חינוך חברתי, טכנולוגיה, כלכלה, סטטיסטיקה, פיננסים, מנהיגות, תקשורת, ארכיטקטורה, עיצוב, פיתוח תוכנה, בינה מלאכותית, אבטחת מידע) 
        - נושא היחידה
        - זמן כולל 
        - שכבת גיל
        - ידע קודם נדרש
        - מיקום בתוכן (תיבת בחירה עם האפשרויות: פתיחת נושא, הקנייה, תרגול, סיכום נושא)
        - מטרות ברמת התוכן
        - מטרות ברמת המיומנויות
      2. בניית השיעור הכוללת את סוגי הפעילויות\שלבים בפעילות (לא שדות - פעולות אפשריות במבנה השיעור) :
        - פתיחה (opening)
        - גוף השיעור (main)
        - סיכום (summary)

          כל אחד מהם כולל בתוכו את השדות: 
        - תוכן/פעילות
        - מסך 1 (תיבת בחירה עם האפשרויות:   סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת) 
        - תיאור תצוגת מסך 1
        - מסך 2 (תיבת בחירה עם האפשרויות:   סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת) 
        - תיאור תצוגת מסך 2
        - מסך 3 (תיבת בחירה עם האפשרויות:   סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת) 
        - תיאור תצוגת מסך 3
        - שימוש במרחב הפיזי(תיבת בחירה עם האפשרויות: מליאה, עבודה בקבוצות, עבודה אישית, משולב) 

      דוגמא למבנה תשובה בסיסי JSON לעדכון שדה מסוים (כל השדות החוזרים יהיו בתוך סוגריים מרובעים - מערך של אובייקטים ב-JSON חייב להחזיר את שלושת השדות גם אם אחד מהם ריק):
      דוגמא RESPONSE המעדכן שדה "מסך 1" - ערך חדש לעדכון 'סרטון' - בפעילות מסוג פתיחה (opening) - פעילות אינדקס 0 
      (יכולות להיות אינסוף פעילויות פתיחה(או\ו גוף השיעור או\ו סיכום) כאשר האינדקס מתקדם כול פעם אם יש יותר מאחת כזו):
      חייב תמיד להחזיר 3 שדות בדיוק בתשובה בדיוק בשמות שמוגדרים 
      (opening.0.screen1 - במקרה זה מדובר על שדה מסך 1 שנמצא בתוך פעילות מסוג פתיחה ,chat - שדה תגובה אנושית בנוגע לשדה המעודכן ,value - הערך שיש לעדכן בתצוגה לפעמים יהיה חובה שערכו יהיה אך ורק מרשימת האפשרויות שהוגדרה מראש)

      דוגמה לתגובה לעדכון שדה במבנה השיעור - פעולת פתיחה :
      [
        {
          "field": "opening.0.screen1",
          "chat": "הוספתי סרטון למסך 1",
          "value": "סרטון"
        }
      ]
      דוגמה לתגובה לעדכון שדה בפרטי השיעור - שדה פשוט :
      [
        {
          "field": "duration",
          "chat": "הסבר על השינוי",
          "value": "45 דקות"
        }
      ]


      השדה "chat" הינו חובה גם כריק חובה להחזירו באובייקט ה JSON !!!
      חובה להחזיר באובייקט של הJSON את שלושת השדות הללו ללא יוצא מין הכלל:

      MUST fields in the JSON objects in the main array response !!!
      "field"
      "chat"
      "value"

      כללי הטיפול בשדות:

      1. כשנאמר "[הצע\תן\צור\ייצר וכדומה..] ערכים לכל השדות":
        - חובה לעדכן את כל השדות בלי יוצא מן הכלל!
        - גם שדות ריקים וגם שדות מלאים
        - גם פרטי השיעור וגם בניית השיעור
        - תן תוכן מפורט וחדש לכל שדה

      2. כשנאמר "מלא שדות ריקים":
        - עדכן רק שדות המסומנים (ריק)
        - אל תיגע בשדות מלאים

      3. חובה להוסיף תגית UI בסוף כל תשובה שמתארת מה שם השדה שעודכן באופן הבא:
        - פרטי שיעור: "<שדה: נושא היחידה>"
        - בניית שיעור: "<שדה: פתיחה - תוכן/פעילות>"

      4. הנחיות לבניית השיעור:
        - יש להציע פעילות פתיחה, גוף שיעור וסיכום נושא עבור כל יחידה.
        - יש להציע לפחות מסך אחד עם התיאור שלו בכל פעילות.
        - אם הוצע מסך אחד, -חובה- להציע גם תיאור למסך.
        - אין בשום פנים ואופן להציע מסך ללא תיאור ולהיפך.
        בכל תוכן פעילות יש לפרט:
        - מה התלמידים עושים בשדה תוכן/פעילות
        - חובה לבחור אפשרות אחת -בלבד- מתוך הרשימה הבאה עבור שימוש במרחב הפיזי:
          * מליאה
          * עבודה בקבוצות
          * עבודה אישית
          * משולב

      5. הנחיות לשדה "מיקום בתוכן"  (שדה position):
        חובה לבחור אפשרות אחת -בלבד- מתוך הרשימה הבאה:
        * פתיחת נושא
        * הקנייה
        * תרגול
        * סיכום נושא

        - חובה לבחור אפשרות אחת -בלבד- מתוך הרשימה הבאה עבור כל שדות "מסך" (1..2..3..) בפעילות:
          * סרטון - לדוגמא: סרטון הדגמה, סרט תיעודי, סרטון הסבר וכו'
          * תמונה - לדוגמא: תמונה להמחשה, תרשים, איור וכו'
          * פדלט - לדוגמא: לוח שיתופי לאיסוף רעיונות, תשובות תלמידים וכו'
          * אתר - לדוגמא: אתר אינטראקטיבי, סימולציה, משחק למידה וכו'
          * ג'ניאלי - לדוגמא: מצגת אינטראקטיבית, לוח פעיל, משחק וכו'
          * מצגת - לדוגמא: מצגת מידע, מצגת תרגול, מצגת סיכום וכו'

        - הערה: חובה לבחור את סוג התצוגה(השדה מסך) רק מהרשימה הזו! אין להמציא סוגי תצוגה חדשים

        - חשוב! 
        כל מסך חייב לכלול:
          1. סוג תצוגה (screen1/screen2/screen3)
          2. תיאור תצוגה תואם (screen1Description/screen2Description/screen3Description)

        - חשוב ביותר !!!!:
            - חובה להציע תיאור תצוגת מסך אם נבחר סוג תצוגה!!!!!
          - אין להציע סוג תצוגה ללא תיאור תצוגת מסך!!!!!
          
        חובה:
        - אין להציע תיאור מסך ללא הגדרת סוג תצוגה!
        - סוג התצוגה והתיאור חייבים להתאים! לדוגמא:
          * אם נבחר "סרטון" - התיאור חייב להיות של סרטון
          * אם נבחר "תמונה" - התיאור חייב להיות של תמונה
          * אם נבחר "פדלט" - התיאור חייב להיות של פדלט
          וכן הלאה...

        דוגמאות נכונות:
        1. עבור סרטון:
        [
          {
            "field": "opening.0.screen1",
            "chat": "הוספתי סרטון למסך 1",
            "value": "סרטון"
          },
          {
            "field": "opening.0.screen1Description",
            "chat": "הוספתי תיאור לסרטון במסך 1",
            "value": "סרטון המדגים תופעת טבע של גלי ים..."
          }
        ]

        2. עבור תמונה:
        [
          {
            "field": "opening.0.screen2",
            "chat": "הוספתי תמונה למסך 2",
            "value": "תמונה"
          },
          {
            "field": "opening.0.screen2Description",
            "chat": "הוספתי תיאור לתמונה במסך 2",
            "value": "תמונה המציגה מבט על של חוף הים..."
          }
        ]

        חשוב: יש לוודא שהתיאור תואם לסוג התצוגה שנבחר!

        - בתיאור המסך יש לפרט:
          * מה יוצג במסך (תוכן ספציפי)
          * כיצד ישתמשו בתוכן במהלך הפעילות
          * איך התוכן תורם למטרות הפעילות
          
        שימו לב: אסור להציע שינוי בתיאור מסך (screenDescription) מבלי להגדיר גם את סוג התצוגה המתאים!
        - מה המורה עושה

      [מיפוי שדות]
      ${fieldsMapping}

      [מצב נוכחי של השדות]
      ${fieldsContext}

      ${materialsContext}

      [בקשת המשתמש]
      ${config.message}

      חובה להחזיר אך ורק מערך JSON בפורמט הבא (כולל המבנה המדויק של הסוגריים):

      [
        {
          "field": "duration",
          "chat": "הסבר על השינוי",
          "value": "ערך מדויק"
        }
      ]

      אם אתה משנה מספר שדות, צריך להיות בדיוק כך:

      [
        {
          "field": "duration",
          "chat": "הסבר על השינוי",
          "value": "ערך מדויק"
        },
        {
          "field": "gradeLevel",
          "chat": "הסבר על השינוי",
          "value": "ערך מדויק"
        }
      ]

      דוגמה לתשובה מלאה במקרה שהמשתמש ביקש להתאים את הקטגוריה לנושא היחידה:
      [
        {
          "field": "category",
          "chat": "בחרתי את הקטגוריה המתאימה ביותר לנושא היחידה <שדה: קטגוריה>",
          "value": "מדעים"
        }
      ]

      דוגמה לתשובה מלאה במקרה שהמשתמש ביקש לעדכן את נושא היחידה:
      [
        {
          "field": "topic",
          "chat": "עדכנתי את נושא היחידה לנושא מרתק המתאים במיוחד לחדר האימרסיבי <שדה: נושא היחידה>",
          "value": "מסע אל מערכת השמש - חקר כוכבי הלכת בסביבה אימרסיבית"
        }
      ]

      דוגמה לתשובה מלאה במקרה שהמשתמש ביקש להוסיף או להציע או לנסח זמן כולל:
      [
      {
          "field": "duration",
          "chat": "הסבר על השינוי",
          "value": "ערך מדויק"
        }
      ]

      דוגמה לתשובה מלאה במקרה שהמשתמש ביקש להוסיף או להציע או לנסח שכבת גיל:
      [
        {
          "field": "gradeLevel",
          "chat": "הסבר על השינוי",
          "value": "ערך מדויק"
        }
      ]

      דוגמה לתשובה מלאה במקרה שהמשתמש ביקש להוסיף או להציע או לנסח מיקום בתוכן:
      [
        {
          "field": "position",
          "chat": "עדכנתי את המיקום בתוכן כדי לשקף טוב יותר את מטרת היחידה <שדה: מיקום בתוכן>",
          "value": "הקנייה"
        }
      ]

      דוגמה לתשובה מלאה במקרה שהמשתמש ביקש להוסיף או להציע או לנסח פעילות פתיחה מלאה:
      [ 
        {
          "field": "opening.0.content",
          "chat": "הוספתי פעילות פתיחה שמנצלת את המסכים והחלל באופן מיטבי <שדה: פתיחה - תוכן/פעילות>",
          "value": "התלמידים נכנסים לחדר חשוך כשעל שלושת המסכים מוקרנים שמי הלילה מזוויות שונות. המורה מציגה שאלה מעוררת חשיבה על המסך המרכזי: 'מה קורה לכוכבים ביום?' התלמידים מתפזרים בחלל ורושמים את השערותיהם על טאבלטים."
        },
        {
          "field": "opening.0.screenUsage",
          "chat": "הוספתי שימוש במסכים לפעילות פתיחה <שדה: פתיחה - שימוש במרחב>",
          "value": "משולב"
        },
        {
          "field": "opening.0.screen1",
          "chat": "הוספתי סרטון לפעילות פתיחה למסך 1 <שדה: פתיחה - סרטון>",
          "value": "סרטון"
        },
        {
          "field": "opening.0.screen1Description",
          "chat": "הוספתי תיאור למסך 1 <שדה: פתיחה - תיאור מסך 1>",
          "value": "סרטון על תהליך הכוכבים בשמי הלילה"
        },
        {
          "field": "opening.0.screen2",
          "chat": "הוספתי תמונה לפעילות פתיחה למסך 2 <שדה: פתיחה - תמונה>",
          "value": "תמונה"
        },
        {
          "field": "opening.0.screen2Description",
          "chat": "הוספתי תיאור למסך 2 <שדה: פתיחה - תיאור מסך 2>",
          "value": "תמונה של כוכבים בשמי הלילה"
        },
        {
          "field": "opening.0.screen3",
          "chat": "הוספתי פדלט לפעילות פתיחה למסך 3 <שדה: פתיחה - פדלט>",
          "value": "פדלט"
        },
        {
          "field": "opening.0.screen3Description",
          "chat": "הוספתי תיאור למסך 3 <שדה: פתיחה - תיאור מסך 3>",
          "value": "כאן תיאור מפורט של פדלט"
        }
      ]

      הערה חשובה בנוגע לתיאורי מסכים: 
      1. כל תיאור מסך חייב להיות תחת שדה נפרד משלו (screen1Description, screen2Description, screen3Description)
      2. אין להשתמש באותו שדה עבור תיאורי מסכים שונים
      3. אסור להכניס מספר תיאורי מסכים לאותו שדה

      כללים בנוגע לתשובה של פעילות פתיחה או גוף שיעור או סיכום:
      1. אין להחזיר יותר מערך אחד של השדה שימוש במרחב בפעילות כלשהי - לדוגמא opening.0.screenUsage can be only one for opening.0
      2. אין להחזיר יותר מערך אחד של השדה מסך 1 בפעילות כלשהי - לדוגמא opening.0.screen1 can be only one for opening.0
      3. שדה המסך והתיאור שלו חייבים להיות זוג תקין - אם יש מסך חייב להיות גם תיאור ולהיפך
      כדי ליצור כמה פעילויות פתיחה שונות יש לקדם את האינדקס אחרי סוג הפעילות - לדוגמא opening.0, opening.1, opening.2 וכו'
      4. main.0.screen3 ללא main.0.screen3Description או להיפך אינו תקין  !!!

      חובה:
      1. השתמש רק במפתחות הטכניים שמופיעים במיפוי למעלה (כמו "duration", לא "זמן כולל")
      2. תמיד תחזיר מערך שמתחיל ב-[ ומסתיים ב-], גם אם יש רק פריט אחד
      3. וודא שהפסיקים והרווחים בדיוק כמו בדוגמה (2 רווחים להזחה)
      4. אסור להוסיף טקסט מחוץ ל-JSON

      חשוב: 
      - הערך של "value" חייב להיות טקסט ולא מערך של טקסטים
      - הערך ב-value חייב להיות הערך הסופי והמלא, לא תבנית
      - אל תשתמש בסימני [] או תבניות למילוי
      - תן ערך מוחלט ומלא שמתאים לשדה שהוא מתאר
  `;

//   const newPrompt = `
//   STRICT INSTRUCTION:  
//   Answer must ***ONLY*** be in HEBREW! NO other languages allowed!  
//   You must respond with a single array of JSON objects.  
//   The JSON objects must contain exactly these 3 fields: "field", "chat", "value".  
//   Do not include any other text. Do not explain. Do not acknowledge.  
//   Format: {"field": "", "chat": "", "value": ""}  
//   there must be a tag like "<שדה: נושא היחידה>" at the end of each chat message that describes the field.
  

// אתה עוזר למורים לתכנן שיעור בנושא יצירת חדר אימרסיבי.  
// יש לעדכן שדות מסוימים על פי בקשת המשתמש תוך שמירה על הכללים הבאים:  

// [הנחיות חובה]  

// 1. **פרטי השיעור (Fields for Lesson Details)**  
//     - קטגוריה ('category') – בחירה מתוך רשימה מוגדרת.  
//     - נושא היחידה ('topic').  
//     - זמן כולל ('duration').  
//     - שכבת גיל ('gradeLevel').  
//     - ידע קודם נדרש ('priorKnowledge').  
//     - מיקום בתוכן ('position') – אפשרויות בלבד: פתיחת נושא, הקנייה, תרגול, סיכום נושא.  
//     - מטרות ברמת התוכן ('contentGoals').  
//     - מטרות ברמת המיומנויות ('skillGoals').  

// 2. **מבנה השיעור (Lesson Structure)**  
//     - השיעור מחולק לשלושה שלבים: פתיחה ('opening'), גוף השיעור ('main'), סיכום ('summary').  
//     - כל שלב מכיל:  
//         * תוכן ('content').  
//         * מסכים ('screen1', 'screen2', 'screen3') – בחירה מתוך: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת.  
//         * תיאור המסכים ('screen1Description', 'screen2Description', 'screen3Description').  
//         * שימוש במרחב ('screenUsage') – אפשרויות בלבד: מליאה, עבודה בקבוצות, עבודה אישית, משולב.  

// [הנחיות כלליות]  

// 1. **אסור להוסיף שדות חדשים** – השתמש **רק** בשדות הקיימים.  
// 2. **יש לבחור ערכים מתוך הרשימות בלבד** – אין להמציא קטגוריות, מסכים, או תיאורים.  
// 3. **כל מסך חייב לכלול תיאור מתאים** – אם קיים 'screen1', חייב להיות 'screen1Description'.  
// 4. **החזֵר JSON תקני בלבד** – ללא טקסט נוסף.  

// [מיפוי שדות]  
// ${fieldsMapping}  

// [מצב נוכחי של השדות]  
// ${fieldsContext}  

// [בקשת המשתמש]  
// ${config.message}  

// [דוגמאות לתשובות תקינות]  

// **עדכון קטגוריה**  
// [
//   {
//     "field": "category",
//     "chat": "בחרתי קטגוריה בהתאם לנושא השיעור",
//     "value": "מדעים"
//   }
// ]

// **עדכון תוכן מסך בפעילות פתיחה**  
// [
//   {
//     "field": "opening.0.screen1",
//     "chat": "הוספתי סרטון לפעילות הפתיחה",
//     "value": "סרטון"
//   },
//   {
//     "field": "opening.0.screen1Description",
//     "chat": "תיאור סרטון המסביר על מערכת השמש",
//     "value": "סרטון המדגים את תנועת כוכבי הלכת סביב השמש"
//   }
// ]

// **עדכון זמן שיעור**  
// [
//   {
//     "field": "duration",
//     "chat": "עדכנתי את זמן השיעור",
//     "value": "60 דקות"
//   }
// ]

// [כללים מחייבים]  
// ✔ **תמיד להחזיר מערך JSON תקני.**  
// ✔ **להשתמש רק בשדות קיימים.**  
// ✔ **חובה לבחור ערכים מרשימות מוגדרות מראש.**  
// ✔ **כל מסך חייב לכלול תיאור תואם.**  

// ❌ **אסור לכלול טקסט מחוץ ל-JSON.**  
// ❌ **אסור להחזיר מסך ללא תיאור.**  

// בהתאם לבקשת המשתמש, עדכן את השדות וחזֵר רק את ה-JSON המתאים.
//   `;

  return originalPrompt;
}

export function generateChatPrompt(config: {
  materials?: { title: string; content: string } | string;
  message: string;
  currentValues: Record<string, string>;
  fieldLabels?: Record<string, string>;
  history: Array<{ text: string; sender: 'user' | 'ai'; timestamp: Date }>;
}): string {

  //add log to all the fields
  console.log('generateChatPrompt config:', config);
  console.log('generateChatPrompt config message:', config.message);
  console.log('generateChatPrompt config currentValues:', config.currentValues);
  console.log('generateChatPrompt config fieldLabels:', config.fieldLabels);
  console.log('generateChatPrompt config materials:', config.materials);
  console.log('generateChatPrompt config history:', config.history);
  
  let materialsSection = '';
  if (config.materials) {
    materialsSection = '\n[חומרי עזר]\n';
    if (typeof config.materials === 'object' && config.materials.title && config.materials.content) {
      materialsSection += `כותרת: ${config.materials.title}\nתוכן: ${config.materials.content}`;
    } else {
      materialsSection += config.materials;
    }
  }

  const contextSection = Object.entries(config.currentValues)
    .map(([key, value]) => {
      const label = config.fieldLabels?.[key] || key;
      return `${label}: ${value || '(ריק)'}`;
    })
    .join('\n');

  const historySection = config.history
    .map(msg => `${msg.sender === 'user' ? 'משתמש' : 'מערכת'}: ${msg.text}`)
    .join('\n');

  return `אתה עוזר למורים לתכנן שיעורים בחדר אימרסיבי אבל גם יכול לעשות שיחות חולין - אבל אל תחפור תענה בקצרה.

[מצב נוכחי של השיעור]
${contextSection}
${materialsSection}

[היסטוריית השיחה]
${historySection}

[הנחיות]

סופר חשוב !!!!!
1. יש לענות במשפט אחד קצר -מאוד- לשאלות קצרות! כמו היי,מה קורה? מה שלומך? שלום - ולא להתייחס לנושא התוכן של השדות בשיעור או לשיעור.

חשוב ! אין להאריך סתם בתגובות לשאלות חולין.
דוגמא לתשובה -טובה- במקרה שהמשתמש פונה ב"היי":
"שלום! אני לרשותך במה אול לעזור לך? (אייקון של חיוך)"

דוגמא -לא טובה- במקרה שהמשתמש פנה ב-"היי":
"שלום! אני שמח לעזור לך בתכנון השיעור שלך על אנרגיה מתחדשת בחדר האימרסיבי. נראה שיש לך בסיס מצוין, ואני כאן כדי לסייע לך למקסם את הפוטנציאל של המרחב הזה כדי להפוך את השיעור לחוויה מעשירה ובלתי נשכחת עבור התלמידים שלך. איך אוכל לסייע לך היום באופן ספציפי? האם תרצה להתמקד בפתיחה, בגוף השיעור או בסיכום? או אולי ברעיונות לשילוב המרחב הפיזי בכל אחד מהחלקים הללו?"

חשוב אבל פחות מהסעיף הראשון !!!!!
אחרת יש להתייחס לשאר ההנחיות:

2. אתה יועץ מומחה בתחום החינוך עם התמחות בהוראה בחדר אימרסיבי
3. התייחס לתוכן השיעור ולערכים הנוכחיים בתשובותיך
4. כשהמשתמש שואל שאלה רצינית בנושא, תן תשובה מפורטת ומקצועית
5. כשהמשתמש מבקש רעיונות, הצע רעיונות מעשיים שמתאימים לחדר אימרסיבי
6. שמור על שיחה טבעית ומקצועית
7. אם שאלת המשתמש לא ברורה, תבקש הסבר נוסף
8. תשתמש בשפה נקודתית ומקצועית
9. אם המשתמש מבקש עזרה עם תוכן ספציפי, תן תשובה מקצועית ומפורטת
10. אם המשתמש פונה עם מלל לא ברור או הגיוני כמו ג'יבריש אמור לו שאין לשאלתו הגיון ויש להבהיר טוב יותר את השאלה
11. אם התשובה שלך מדבר על שדה מסויים במסך ציין את שם השדה והסבר על השינוי שהצעת

[בקשת המשתמש]
${config.message}

ענה בצורה מקצועית, תוך התייחסות להקשר השיעור. אל תציין שאתה AI, פשוט ענה כמומחה מקצועי.`;
}

export function generateFullLessonPrompt(args: GenerateFullLessonArgs): string {
  const { topic, materials, category } = args;

    //add log to all the fields
    console.log('generateFullLessonPrompt args:', args);
    console.log('generateFullLessonPrompt args topic:', topic);
    console.log('generateFullLessonPrompt args materials:', materials);
    console.log('generateFullLessonPrompt args category:', category);

  // const materialsSection = args.materials 
  //   ? `\nחומרי למידה שסופקו:\n${args.materials}`
  //   : '';

    let basePrompt = `אתה עוזר למורים לתכנן שיעורים בחדר אימרסיבי. עליך ליצור תכנון שיעור מלא בהתבסס על המידע הבא:

    [מידע על השיעור]`;

      // Add materials section 
      if (args.materials) {
        basePrompt += `\n\n[חומרי עזר]`;
        if (typeof args.materials === 'object' && args.materials.title && args.materials.content) {
          basePrompt += `\nכותרת: ${args.materials.title}\nתוכן: ${args.materials.content}`;
        } else {
          basePrompt += `\n${args.materials}`;  
        }
      }
      
      // מידע על השדות הקיימים
      const existingInfo = [];
      if (topic) {
        existingInfo.push(`נושא היחידה: ${topic}`);
      }
      if (category) {
        existingInfo.push(`קטגוריה: ${category}`);
      }
      if (materials) {
        if (typeof materials === 'object' && materials.title && materials.content) {
          existingInfo.push(`כותרת חומרי עזר: ${materials.title}`);
          existingInfo.push(`חומרי עזר: ${materials.content}`);
        } else {
          existingInfo.push(`חומרי עזר: ${materials}`);
        }
      }
      
      if (existingInfo.length > 0) {
        basePrompt += `\nשדות קיימים:\n${existingInfo.join('\n')}`;
      }
      
      basePrompt += `\n\n[דרישות מיוחדות]`;
      
      // הנחיות ספציפיות לשדות החסרים
      const instructions = [];
      
      if (!topic && !category && materials) {
        instructions.push(`- יש להציע נושא יחידה וקטגוריה מתאימים בהתבסס על חומרי העזר שסופקו`);
      } else if (!topic && category) {
        instructions.push(`- יש להציע נושא יחידה שמתאים לקטגוריה "${category}" ובהתבסס על חומרי העזר במידה שסופקו`);
      } else if (topic && !category) {
        instructions.push(`- יש להציע קטגוריה מתאימה לנושא היחידה "${topic}" ובהתבסס על חומרי העזר במידה שסופקו`);
      }

      instructions.push(
        `- אין להחזיר בתשובה שדות שכבר קיימים:`,
        topic ? `  * אין להחזיר את שדה 'topic' כי כבר קיים` : '',
        category ? `  * אין להחזיר את שדה 'category' כי כבר קיים` : ''
      );
      
      basePrompt += instructions.filter(i => i).join('\n');
    
  return basePrompt +=`
[הנחיות]
אם סופקו חומרי למידה, עלייך לעשות שימוש מקסימלי בחומרי הלמידה כדי ליצור תכנון שיעור מעניין ומעשי.
עליך ליצור תכנון שיעור מלא שיכלול:

1. פרטי שיעור בסיסיים:
 - קטגוריה (category) - חובה לבחור מרשימה מוגדרת 
    * מתמטיקה
    * אנגלית
    * עברית
    * תנ״ך
    * היסטוריה
    * אזרחות
    * ספרות
    * פיזיקה
    * כימיה
    * ביולוגיה
    * מדעים
    * גיאוגרפיה
    * מחשבים
    * אומנות
    * מוזיקה
    * חינוך גופני
    * פילוסופיה
    * פסיכולוגיה
    * סוציולוגיה
    * חינוך חברתי
    * טכנולוגיה
    * כלכלה
    * סטטיסטיקה
    * פיננסים
    * מנהיגות
    * תקשורת
    * ארכיטקטורה
    * עיצוב
    * פיתוח תוכנה
    * בינה מלאכותית
    * אבטחת מידע 
 - נושא היחידה (topic)
 - משך זמן (duration)
 - שכבת גיל (gradeLevel) 
 - ידע קודם נדרש (priorKnowledge)
 - מטרות תוכן (contentGoals) - חזור כמחרוזת אחת מופרדת בפסיקים
 - מטרות מיומנות (skillGoals) - חזור כמחרוזת אחת מופרדת בפסיקים
 - סידור מרחבי (position) - חובה לבחור אחד מ: פתיחת נושא, הקנייה, תרגול, סיכום נושא
 - תיאור כללי (description)

2. מבנה השיעור (שדות בתוך sections):
 כל שלב (opening, main, summary) צריך לכלול מערך של פעילויות, כאשר כל פעילות מכילה:
 - תוכן הפעילות (content)
 - שימוש במרחב (spaceUsage) - חובה לבחור אחד מ: מליאה, עבודה בקבוצות, עבודה אישית, משולב
 - הגדרות מסכים:
   * סוג מסך (screen1, screen2, screen3) - חובה לבחור מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת
   * תיאור מסך (screen1Description, screen2Description, screen3Description)

חשוב מאוד: עליך להחזיר תשובה שמכילה אך ורק את ה-JSON הבא, ללא שום תוספות או הערות:
{
"topic": "נושא היחידה - רק אם השדה ריק",
"category": "קטגוריה - רק אם השדה ריק",
"duration": "משך הזמן",
"gradeLevel": "שכבת גיל",
"priorKnowledge": "ידע קודם נדרש",
"position": "סידור מרחבי - אחד מ: פתיחת נושא, הקנייה, תרגול, סיכום נושא",
"contentGoals": "מטרות תוכן מופרדות בפסיקים",
"skillGoals": "מטרות מיומנות מופרדות בפסיקים",
"description": "תיאור כללי",
"sections": {
    "opening": [{
      "content": "תוכן הפעילות",
      "spaceUsage": "שימוש במרחב - אחד מ: מליאה, עבודה בקבוצות, עבודה אישית, משולב",
      "screen1": "סוג מסך 1 - אחד מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת ",
      "screen1Description": "תיאור מסך 1",
      "screen2": "סוג מסך 2 - אחד מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת ",
      "screen2Description": "תיאור מסך 2",
      "screen3": "סוג מסך 3 - אחד מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת ",
      "screen3Description": "תיאור מסך 3"
    }],
    "main": [{
      "content": "תוכן הפעילות",
      "spaceUsage": "שימוש במרחב - אחד מ: מליאה, עבודה בקבוצות, עבודה אישית, משולב",
      "screen1": "סוג מסך 1 - אחד מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת ",
      "screen1Description": "תיאור מסך 1",
      "screen2": "סוג מסך 2 - אחד מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת ",
      "screen2Description": "תיאור מסך 2",
      "screen3": "סוג מסך 3 - אחד מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת ",
      "screen3Description": "תיאור מסך 3"
    }],
    "summary": [{
      "content": "תוכן הפעילות",
      "spaceUsage": "שימוש במרחב - אחד מ: מליאה, עבודה בקבוצות, עבודה אישית, משולב",
      "screen1": "סוג מסך 1 - אחד מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת ",
      "screen1Description": "תיאור מסך 1",
      "screen2": "סוג מסך 2 - אחד מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת ",
      "screen2Description": "תיאור מסך 2",
      "screen3": "סוג מסך 3 - אחד מ: סרטון, תמונה, פדלט, אתר, ג'ניאלי, מצגת ",
      "screen3Description": "תיאור מסך 3"
    }]
  }
}

חשוב:
1. מטרות תוכן ומטרות מיומנות צריכות להיות מחרוזת אחת עם פסיקים, לא מערך
2. הקפד על הפורמט המדויק ללא שינויים
3. אל תוסיף שדות נוספים
4. תן תשובה בעברית בלבד
5. החזר JSON תקין שניתן לפרסור
6. אל תוסיף הערות, הסברים או טקסט נוסף מחוץ ל-JSON
7. החזר רק את ה-JSON עצמו, ללא סימני markdown או תוספות אחרות
8. חובה להחזיר JSON תקין ומלא עם כל השדות הנדרשים
9. כל סוגריים פסיק וסוגריים מסולסלים חייבים להיות במקומם
`;
}