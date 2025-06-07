
import { supabase } from "@/integrations/supabase/client";
import { ensureDefaultConfig } from "./configHelpers";

export async function seedInitialData() {
  console.log('🌱 DataSeeder: Starting initial data seeding...');
  
  try {
    // Ensure default configuration exists
    await ensureDefaultConfig();
    
    // Check if staff exists
    const { data: existingStaff, error: staffError } = await supabase
      .from('staff_profiles')
      .select('id')
      .limit(1);
      
    if (staffError) {
      console.error('❌ DataSeeder: Error checking existing staff:', staffError);
      throw staffError;
    }
    
    if (!existingStaff || existingStaff.length === 0) {
      console.log('👥 DataSeeder: No staff found, creating sample staff...');
      await createSampleStaff();
    } else {
      console.log('✅ DataSeeder: Staff already exists, skipping staff creation');
    }
    
    console.log('✅ DataSeeder: Initial data seeding completed');
  } catch (error) {
    console.error('❌ DataSeeder: Error seeding initial data:', error);
    throw error;
  }
}

async function createSampleStaff() {
  console.log('👥 DataSeeder: Creating sample staff members...');
  
  const sampleStaff = [
    {
      employee_id: 'EMP001',
      first_name: 'John',
      last_name: 'Smith',
      email: 'john.smith@example.com',
      phone: '07700123456',
      hire_date: '2024-01-15',
      role: 'CCTV Operator',
      eligible_shifts: ['Early', 'Late', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 37,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      hourly_rate: 15.50,
      holiday_multiplier: 2,
      leave_allowance_days: 28,
      is_active: true,
      user_id: '00000000-0000-0000-0000-000000000001' // Dummy user ID
    },
    {
      employee_id: 'EMP002',
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah.johnson@example.com',
      phone: '07700123457',
      hire_date: '2024-02-01',
      role: 'CCTV Operator',
      eligible_shifts: ['Early', 'Late'],
      is_shift_worker: true,
      min_hours_per_week: 32,
      max_hours_per_week: 40,
      opted_out_wtd: false,
      days_off_per_week: 3,
      hourly_rate: 16.00,
      holiday_multiplier: 2,
      leave_allowance_days: 28,
      is_active: true,
      user_id: '00000000-0000-0000-0000-000000000002' // Dummy user ID
    },
    {
      employee_id: 'EMP003',
      first_name: 'Michael',
      last_name: 'Brown',
      email: 'michael.brown@example.com',
      phone: '07700123458',
      hire_date: '2024-03-01',
      role: 'Senior CCTV Operator',
      eligible_shifts: ['Late', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 40,
      max_hours_per_week: 48,
      opted_out_wtd: true,
      days_off_per_week: 2,
      hourly_rate: 17.50,
      holiday_multiplier: 2,
      leave_allowance_days: 30,
      is_active: true,
      user_id: '00000000-0000-0000-0000-000000000003' // Dummy user ID
    }
  ];
  
  try {
    const { error } = await supabase
      .from('staff_profiles')
      .insert(sampleStaff);
      
    if (error) {
      console.error('❌ DataSeeder: Error creating sample staff:', error);
      throw error;
    }
    
    console.log('✅ DataSeeder: Sample staff created successfully');
  } catch (error) {
    console.error('❌ DataSeeder: Exception creating sample staff:', error);
    throw error;
  }
}
