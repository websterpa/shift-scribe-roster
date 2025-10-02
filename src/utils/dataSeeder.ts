
import { supabase } from "@/integrations/supabase/client";

export async function seedInitialData() {
  console.log('🌱 DataSeeder: Starting initial data seeding...');
  
  try {
    // Check if user is authenticated first
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('👤 DataSeeder: No authenticated user, skipping data seeding');
      return;
    }
    
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
      await createSampleStaff(user.id);
    } else {
      console.log('✅ DataSeeder: Staff already exists, skipping staff creation');
    }
    
    console.log('✅ DataSeeder: Initial data seeding completed');
  } catch (error) {
    console.error('❌ DataSeeder: Error seeding initial data:', error);
    // Don't throw - allow app to continue without sample data
  }
}

async function createSampleStaff(userId: string) {
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
      user_id: userId
    },
    {
      employee_id: 'EMP002',
      first_name: 'Sarah',
      last_name: 'Johnson',
      email: 'sarah.johnson@example.com',
      phone: '07700123457',
      hire_date: '2024-02-01',
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
      user_id: userId
    },
    {
      employee_id: 'EMP003',
      first_name: 'Michael',
      last_name: 'Brown',
      email: 'michael.brown@example.com',
      phone: '07700123458',
      hire_date: '2024-03-01',
      role: 'Senior CCTV Operator',
      eligible_shifts: ['Early', 'Late', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 40,
      max_hours_per_week: 48,
      opted_out_wtd: true,
      days_off_per_week: 2,
      hourly_rate: 17.50,
      holiday_multiplier: 2,
      leave_allowance_days: 30,
      is_active: true,
      user_id: userId
    },
    {
      employee_id: 'EMP004',
      first_name: 'Emma',
      last_name: 'Wilson',
      email: 'emma.wilson@example.com',
      phone: '07700123459',
      hire_date: '2024-01-20',
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
      user_id: userId
    },
    {
      employee_id: 'EMP005',
      first_name: 'James',
      last_name: 'Taylor',
      email: 'james.taylor@example.com',
      phone: '07700123460',
      hire_date: '2023-11-10',
      role: 'Senior CCTV Operator',
      eligible_shifts: ['Early', 'Late', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 40,
      max_hours_per_week: 48,
      opted_out_wtd: true,
      days_off_per_week: 2,
      hourly_rate: 17.50,
      holiday_multiplier: 2,
      leave_allowance_days: 30,
      is_active: true,
      user_id: userId
    },
    {
      employee_id: 'EMP006',
      first_name: 'Sophie',
      last_name: 'Davies',
      email: 'sophie.davies@example.com',
      phone: '07700123461',
      hire_date: '2024-02-15',
      role: 'CCTV Operator',
      eligible_shifts: ['Early', 'Late'],
      is_shift_worker: true,
      min_hours_per_week: 32,
      max_hours_per_week: 40,
      opted_out_wtd: false,
      days_off_per_week: 3,
      hourly_rate: 15.50,
      holiday_multiplier: 2,
      leave_allowance_days: 28,
      is_active: true,
      user_id: userId
    },
    {
      employee_id: 'EMP007',
      first_name: 'David',
      last_name: 'Martinez',
      email: 'david.martinez@example.com',
      phone: '07700123462',
      hire_date: '2023-09-01',
      role: 'Senior CCTV Operator',
      eligible_shifts: ['Early', 'Late', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 40,
      max_hours_per_week: 48,
      opted_out_wtd: true,
      days_off_per_week: 2,
      hourly_rate: 18.00,
      holiday_multiplier: 2,
      leave_allowance_days: 30,
      is_active: true,
      user_id: userId
    },
    {
      employee_id: 'EMP008',
      first_name: 'Lucy',
      last_name: 'Anderson',
      email: 'lucy.anderson@example.com',
      phone: '07700123463',
      hire_date: '2024-03-10',
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
      user_id: userId
    },
    {
      employee_id: 'EMP009',
      first_name: 'Oliver',
      last_name: 'Thomas',
      email: 'oliver.thomas@example.com',
      phone: '07700123464',
      hire_date: '2023-12-01',
      role: 'CCTV Operator',
      eligible_shifts: ['Late', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 37,
      max_hours_per_week: 48,
      opted_out_wtd: false,
      days_off_per_week: 2,
      hourly_rate: 16.00,
      holiday_multiplier: 2,
      leave_allowance_days: 28,
      is_active: true,
      user_id: userId
    },
    {
      employee_id: 'EMP010',
      first_name: 'Isabella',
      last_name: 'Jackson',
      email: 'isabella.jackson@example.com',
      phone: '07700123465',
      hire_date: '2024-01-05',
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
      user_id: userId
    },
    {
      employee_id: 'EMP011',
      first_name: 'Ryan',
      last_name: 'White',
      email: 'ryan.white@example.com',
      phone: '07700123466',
      hire_date: '2023-10-15',
      role: 'Senior CCTV Operator',
      eligible_shifts: ['Early', 'Late', 'Night'],
      is_shift_worker: true,
      min_hours_per_week: 40,
      max_hours_per_week: 48,
      opted_out_wtd: true,
      days_off_per_week: 2,
      hourly_rate: 17.50,
      holiday_multiplier: 2,
      leave_allowance_days: 30,
      is_active: true,
      user_id: userId
    },
    {
      employee_id: 'EMP012',
      first_name: 'Chloe',
      last_name: 'Harris',
      email: 'chloe.harris@example.com',
      phone: '07700123467',
      hire_date: '2024-02-20',
      role: 'CCTV Operator',
      eligible_shifts: ['Early', 'Late'],
      is_shift_worker: true,
      min_hours_per_week: 32,
      max_hours_per_week: 40,
      opted_out_wtd: false,
      days_off_per_week: 3,
      hourly_rate: 15.50,
      holiday_multiplier: 2,
      leave_allowance_days: 28,
      is_active: true,
      user_id: userId
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
