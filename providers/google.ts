import { AIProvider, ProviderConfig } from './types.ts';
import { makeRequest } from '../utils/http.ts';
import { logDebug, logError, logRequest, logResponse } from '../utils/logging.ts';

export class GoogleAIProvider implements AIProvider {
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly apiKey: string;
  private readonly models: string[];
  private readonly timeout: number;
  private readonly modelRetries: number;

  constructor(config: ProviderConfig) {
    const { apiKey, model = 'gemini-pro', timeout = 180000, modelRetries = 1 } = config;
    
    if (!apiKey) throw new Error('Google API key is required');
    
    this.apiKey = apiKey;
    this.models = Array.isArray(model) ? model : [model];
    this.timeout = timeout;
    this.modelRetries = modelRetries;

    logDebug('GoogleAI', 'Initialized with config:', { models: this.models, timeout, modelRetries });
  }

  async generateCompletion(prompt: string): Promise<string> {
    logDebug('GoogleAI', 'Generating completion for prompt:', prompt);
    let lastError: Error | null = null;

    for (let retry = 0; retry < this.modelRetries; retry++) {
      logDebug('GoogleAI', `התחלת ניסיון מספר ${retry + 1}/${this.modelRetries}`);
      
      for (const currentModel of this.models) {
        logDebug('GoogleAI', `מנסה עם מודל ${currentModel} (ניסיון ${retry + 1}/${this.modelRetries})`);
        
        try {
          // הוספנו דוגמה מפורטת של ה-JSON הנדרש
          const formattedPrompt = `You are a helpful assistant with expertise in education and lesson planning.

IMPORTANT INSTRUCTIONS:
1. You must ALWAYS respond in Hebrew
2. You must return ONLY the JSON itself, without any markdown formatting or additional text
3. The response must be a single JSON object that matches this exact structure, using ONLY the specified values for position, spaceUsage, and screen types:

position must be one of: "פתיחת נושא", "הקנייה", "תרגול", "סיכום נושא"
spaceUsage must be one of: "מליאה", "עבודה בקבוצות", "עבודה אישית", "משולב"
screen1/2/3 must be one of: "סרטון", "תמונה", "פדלט", "אתר", "ג'ניאלי", "מצגת"

Full example:
{
  "duration": "90 דקות",
  "gradeLevel": "י'-יב'",
  "priorKnowledge": "הבנה בסיסית בקולנוע, היכרות עם ז'אנרים",
  "position": "הקנייה",
  "contentGoals": "הבנת התפתחות הז'אנר, זיהוי מאפיינים מרכזיים, ניתוח השפעות תרבותיות",
  "skillGoals": "ניתוח סרטים, חשיבה ביקורתית, עבודת צוות",
  "description": "שיעור על סרטי מדע בדיוני והשפעתם",
  "sections": {
    "opening": [{
      "content": "דיון פתיחה וצפייה בקטע נבחר",
      "spaceUsage": "מליאה",
      "screen1": "סרטון",
      "screen1Description": "קטע מסרט מדע בדיוני קלאסי",
      "screen2": "תמונה",
      "screen2Description": "פוסטר של הסרט",
      "screen3": "פדלט",
      "screen3Description": "לוח שיתופי לדיון"
    }],
    "main": [{
      "content": "ניתוח מאפייני הז'אנר",
      "spaceUsage": "עבודה בקבוצות",
      "screen1": "מצגת",
      "screen1Description": "מצגת על מאפייני הז'אנר",
      "screen2": "אתר",
      "screen2Description": "מאגר סרטים לניתוח",
      "screen3": "ג'ניאלי",
      "screen3Description": "משימת ניתוח קבוצתית"
    }],
    "summary": [{
      "content": "סיכום והצגת תוצרים",
      "spaceUsage": "מליאה",
      "screen1": "מצגת",
      "screen1Description": "הצגת עבודות הקבוצות",
      "screen2": "פדלט",
      "screen2Description": "סיכום תובנות",
      "screen3": "",
      "screen3Description": ""
    }]
  }
}

Here is the task:

${prompt}`;

          logDebug('GoogleAI', `Attempting with model ${currentModel} (Retry ${retry + 1}/${this.modelRetries})`);
          logDebug('GoogleAI', 'Complete formatted prompt:', formattedPrompt);
          
          const requestBody = {
            contents: [{
              role: 'user',
              parts: [{
                text: formattedPrompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE"
              }
            ]
          };

          logRequest('GoogleAI', requestBody);

          const response = await makeRequest(
            `${this.baseUrl}/models/${currentModel}:generateContent?key=${this.apiKey}`,
            {
              body: requestBody,
              timeout: this.timeout
            }
          );

          if (!response.ok) {
            const error = await response.json();
            logError('GoogleAI API error:', error);
            lastError = new Error(`Google AI API error: ${error.error?.message || JSON.stringify(error)}`);
            logError('GoogleAI', `מודל ${currentModel} נכשל, עובר למודל הבא`);
            continue;
          }

          const data = await response.json();
          logResponse('GoogleAI', data);
          console.log('[GoogleAI] Full API Response:', data);

          if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            logError('GoogleAI invalid response format:', data);
            lastError = new Error('Invalid response structure from Gemini API');
            logError('GoogleAI', `מודל ${currentModel} החזיר מבנה לא תקין, עובר למודל הבא`);
            continue;
          }

          const responseText = data.candidates[0].content.parts[0].text;
          console.log('[GoogleAI] Raw response text:', responseText);

          // ניקוי התשובה
          const cleanedResponse = responseText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          
          console.log('[GoogleAI] Cleaned response:', cleanedResponse);

          try {
            // בדיקה שה-JSON תקין
            const parsed = JSON.parse(cleanedResponse);
            console.log('[GoogleAI] Successfully parsed JSON:', parsed);
            return JSON.stringify(parsed);
          } catch (e) {
            console.log('[GoogleAI] Failed to parse cleaned response:', e);
            
            // נסיון אחרון - חיפוש JSON בתוך התשובה
            const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              console.log('[GoogleAI] Found JSON in response:', jsonMatch[0]);
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                console.log('[GoogleAI] Successfully parsed extracted JSON');
                return JSON.stringify(parsed);
              } catch (e) {
                console.log('[GoogleAI] Failed to parse extracted JSON:', e);
                throw new Error('Invalid JSON response from AI');
              }
            } else {
              console.log('[GoogleAI] No JSON found in response');
              throw new Error('No JSON found in AI response');
            }
          }
        } catch (error) {
          logError('GoogleAI completion error:', error);
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = error instanceof Error ? error.message : String(error);
          logError('GoogleAI', `מודל ${currentModel} נכשל עם שגיאה: ${errorMessage}, עובר למודל הבא`);
          continue;
        }
      }
    }

    // אם הגענו לכאן, כל הניסיונות נכשלו
    throw lastError || new Error('כל הניסיונות למודלים נכשלו');
  }
}
