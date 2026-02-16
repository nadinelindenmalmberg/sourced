/**
 * Presentation helpers for recipe difficulty.
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-500 text-white';
    case 'medium':
      return 'bg-yellow-500 text-white';
    case 'hard':
      return 'bg-red-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export function getDifficultyText(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return 'Enkel';
    case 'medium':
      return 'Medel';
    case 'hard':
      return 'Utmaning';
    default:
      return difficulty;
  }
}
