
import { buildRosterCycle } from './rosterCycle';

// Test function to verify shift grouping
export function testShiftGrouping() {
  console.log('🧪 Testing shift grouping functionality...');
  
  const testStaff = [
    {
      id: 'staff1',
      eligible_shifts: ['Day', 'Night'],
      is_shift_worker: true
    },
    {
      id: 'staff2', 
      eligible_shifts: ['Early', 'Late', 'Night'],
      is_shift_worker: true
    },
    {
      id: 'staff3',
      eligible_shifts: ['Day', 'Night'],
      is_shift_worker: true
    },
    {
      id: 'supervisor1',
      eligible_shifts: [],
      is_shift_worker: false
    }
  ];

  const result = buildRosterCycle(
    testStaff,
    2, // 2 weeks
    '12h',
    24,
    0,
    { day_shift_staff: 2, night_shift_staff: 1 }
  );

  // Analyze patterns for each staff member
  testStaff.filter(s => s.is_shift_worker).forEach(staff => {
    const pattern: string[] = [];
    
    // Extract pattern for this staff member
    for (let w = 0; w < 2; w++) {
      for (let d = 0; d < 7; d++) {
        pattern.push(result[w][d][staff.id]);
      }
    }
    
    console.log(`👤 ${staff.id} pattern:`, pattern.join(''));
    
    // Check for grouping - count consecutive work blocks
    let workBlocks = 0;
    let currentBlockLength = 0;
    let inWorkBlock = false;
    
    const seq = Array.isArray(pattern) ? pattern : [];
    seq.forEach(shift => {
      if (shift !== 'R') {
        if (!inWorkBlock) {
          workBlocks++;
          inWorkBlock = true;
          currentBlockLength = 1;
        } else {
          currentBlockLength++;
        }
      } else {
        if (inWorkBlock) {
          console.log(`  📊 Work block ${workBlocks}: ${currentBlockLength} days`);
          inWorkBlock = false;
          currentBlockLength = 0;
        }
      }
    });
    
    if (inWorkBlock && currentBlockLength > 0) {
      console.log(`  📊 Work block ${workBlocks}: ${currentBlockLength} days`);
    }
    
    console.log(`  ✅ Total work blocks: ${workBlocks}`);
  });

  console.log('🧪 Shift grouping test completed');
  return result;
}
