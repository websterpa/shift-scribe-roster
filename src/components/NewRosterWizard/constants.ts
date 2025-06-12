
export const COMMON_TEMPLATES = {
  '8h': [
    { id: 'continental', name: 'Continental (7-day)', pattern: ['D', 'D', 'R', 'R', 'R', 'N', 'N'] },
    { id: '4-on-4-off', name: '4-On/4-Off', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R'] },
    { id: '5-2-standard', name: '5-2 Standard', pattern: ['D', 'D', 'D', 'D', 'D', 'R', 'R'] }
  ],
  '12h': [
    { id: 'dupont', name: 'DuPont (14-day)', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R'] },
    { id: 'day-night-2-crew', name: 'Day/Night 2-Crew', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R', 'R'] },
    { id: '3-4-3-weekend', name: '3-4-3 Weekend-Balanced', pattern: ['D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N'] }
  ]
} as const;
