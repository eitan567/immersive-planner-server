export interface GenerateSuggestionArgs {
  context: string;
  type: 'topic' | 'duration' | 'priorKnowledge' | 'gradeLevel' | 'contentGoals' | 'skillGoals' | 'position' | 'activity' | 'description';
  currentValue: string;
  message?: string;
}

export interface UpdateLessonFieldArgs {
  message: string;
  fieldLabels: Record<string, string>;
  rephrase?: boolean;
  currentValues?: Record<string, string>;
}