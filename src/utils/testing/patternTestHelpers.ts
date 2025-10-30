import { supabase } from "@/integrations/supabase/client";
import { getTenantId } from "@/features/tenant/useTenant";

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Seed dummy patterns for testing purposes
 * @returns Array of created pattern IDs
 */
export async function seedTestPatterns() {
  console.log("🧪 Seeding test patterns...");
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("❌ No authenticated user found for seeding patterns");
    return [];
  }

  const testPatterns = [
    {
      name: "Test Pattern 8h",
      system: "8h",
      sequence: ["D", "D", "E", "E", "L", "L", "R", "R"],
      cycle_length: 17,
      site_id: "TEST-SITE-1",
      created_by: user.id,
      tenant_id: DEMO_TENANT_ID
    },
    {
      name: "Test Pattern 12h",
      system: "12h",
      sequence: ["D", "D", "D", "D", "R", "R", "R", "R", "N", "N", "N", "N", "R", "R", "R", "R"],
      cycle_length: 17,
      site_id: "TEST-SITE-1",
      created_by: user.id,
      tenant_id: DEMO_TENANT_ID
    }
  ];

  const { data, error } = await supabase
    .from("site_patterns")
    .insert(testPatterns)
    .select();

  if (error) {
    console.error("❌ Error seeding test patterns:", error);
    return [];
  }

  console.log("✅ Test patterns seeded:", data?.length || 0);
  return data?.map(p => p.id) || [];
}

/**
 * Clean up test patterns
 * @param patternIds Array of pattern IDs to delete
 */
export async function cleanupTestPatterns(patternIds: string[]) {
  if (patternIds.length === 0) return;

  console.log("🧹 Cleaning up test patterns...");
  
  const { error } = await supabase
    .from("site_patterns")
    .delete()
    .in("id", patternIds);

  if (error) {
    console.error("❌ Error cleaning up test patterns:", error);
  } else {
    console.log("✅ Test patterns cleaned up");
  }
}
