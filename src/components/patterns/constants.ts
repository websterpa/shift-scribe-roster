
export const COMMON_PATTERNS = {
  '8h': [
    { id: 'continental', name: 'Continental (7-day)', pattern: ['D', 'D', 'R', 'R', 'R', 'N', 'N'], description: 'Classic 7-day rotating pattern' },
    { id: '4-on-4-off', name: '4-On/4-Off', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R'], description: '4 days on, 4 days off' },
    { id: '5-2-standard', name: '5-2 Standard', pattern: ['D', 'D', 'D', 'D', 'D', 'R', 'R'], description: 'Monday to Friday work pattern' },
    { id: 'pitman', name: 'Pitman', pattern: ['D', 'D', 'R', 'N', 'N', 'R', 'R'], description: '2-2-3 rotation pattern' }
  ],
  '12h': [
    { id: 'dupont', name: 'DuPont (14-day)', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R'], description: 'Classic 12-hour DuPont pattern' },
    { id: 'day-night-2-crew', name: 'Day/Night 2-Crew', pattern: ['D', 'D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N', 'N', 'R', 'R', 'R', 'R'], description: '16-day rotation for 2 crews' },
    { id: '3-4-3-weekend', name: '3-4-3 Weekend-Balanced', pattern: ['D', 'D', 'D', 'R', 'R', 'R', 'R', 'N', 'N', 'N'], description: 'Weekend-friendly 10-day pattern' }
  ]
};
