export interface GenerateSuggestionArgs {
  context: string;
  type: 'topic' | 'content' | 'goals' | 'duration' | 'activity';
  currentValue: string;
  message?: string;
}

export interface UpdateLessonFieldArgs {
  message: string;
  fieldLabels: Record<string, string>;
  rephrase?: boolean;
  currentValues?: Record<string, string>;
}