/**
 * Export seed data for regression testing
 * Usage: npx tsx scripts/export-seed-data.ts
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function exportSeedData() {
  console.log('🔄 Exporting seed data...');

  const tables = [
    'staff',
    'roster_config',
    'roster_versions',
    'assignments',
    'leave_requests',
  ];

  const seedData: Record<string, any[]> = {};

  for (const table of tables) {
    console.log(`📥 Fetching ${table}...`);
    const { data, error } = await supabase.from(table).select('*').limit(100);

    if (error) {
      console.error(`❌ Error fetching ${table}:`, error.message);
      continue;
    }

    seedData[table] = data || [];
    console.log(`✅ Exported ${data?.length || 0} rows from ${table}`);
  }

  // Write to file
  const outputPath = path.join(process.cwd(), 'seed-data-snapshot.json');
  fs.writeFileSync(outputPath, JSON.stringify(seedData, null, 2));
  console.log(`📦 Seed data exported to ${outputPath}`);

  // Also export a known-good roster for snapshot testing
  const { data: goodRoster } = await supabase
    .from('assignments')
    .select('*')
    .gte('date', '2025-10-01')
    .lte('date', '2025-10-31')
    .order('date', { ascending: true });

  if (goodRoster) {
    const rosterPath = path.join(process.cwd(), 'roster-snapshot-oct2025.json');
    fs.writeFileSync(rosterPath, JSON.stringify(goodRoster, null, 2));
    console.log(`📊 October 2025 roster snapshot exported to ${rosterPath}`);
  }

  console.log('✅ Export complete!');
}

exportSeedData().catch(console.error);
