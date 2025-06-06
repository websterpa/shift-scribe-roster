
import { supabase } from "@/integrations/supabase/client";
import { createLogger } from "./errorLogger";

const logger = createLogger('SampleDataHelpers');

/**
 * Creates sample staff profiles without requiring auth users
 */
export async function createSampleStaffProfiles() {
  logger.info('Creating sample staff profiles...');
  
  try {
    // First, let's check if we already have sample data
    const { data: existingStaff, error: checkError } = await supabase
      .from('staff_profiles')
      .select('id')
      .limit(1);

    if (checkError) {
      logger.error(new Error('Error checking existing staff'), { error: checkError });
      throw checkError;
    }

    if (existingStaff && existingStaff.length > 0) {
      logger.info('Sample staff profiles already exist, skipping creation');
      return;
    }

    // Create sample staff profiles without user_id foreign key dependency
    const sampleStaff = [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        employee_id: 'EMP001',
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@security.com',
        phone: '07700123001',
        role: 'Security Supervisor',
        hire_date: '2023-01-15',
        hourly_rate: 18.50,
        is_active: true,
        is_shift_worker: false,
        max_hours_per_week: 40,
        min_hours_per_week: 35,
        days_off_per_week: 2,
        leave_allowance_days: 28,
        holiday_multiplier: 2.0,
        opted_out_wtd: false,
        eligible_shifts: ['D'],
        shift_preferences: { preferred_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440002',
        employee_id: 'EMP002',
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@security.com',
        phone: '07700123002',
        role: 'Security Officer',
        hire_date: '2023-02-01',
        hourly_rate: 14.25,
        is_active: true,
        is_shift_worker: true,
        max_hours_per_week: 48,
        min_hours_per_week: 32,
        days_off_per_week: 2,
        leave_allowance_days: 28,
        holiday_multiplier: 2.0,
        opted_out_wtd: false,
        eligible_shifts: ['E', 'L', 'N'],
        shift_preferences: { preferred_shifts: ['E', 'L'], avoid_shifts: ['N'] }
      },
      // Add more sample staff members
      {
        id: '660e8400-e29b-41d4-a716-446655440003',
        employee_id: 'EMP003',
        first_name: 'Michael',
        last_name: 'Brown',
        email: 'michael.brown@security.com',
        phone: '07700123003',
        role: 'Security Officer',
        hire_date: '2023-02-15',
        hourly_rate: 14.75,
        is_active: true,
        is_shift_worker: true,
        max_hours_per_week: 48,
        min_hours_per_week: 30,
        days_off_per_week: 2,
        leave_allowance_days: 28,
        holiday_multiplier: 2.0,
        opted_out_wtd: false,
        eligible_shifts: ['E', 'L', 'N'],
        shift_preferences: { preferred_shifts: ['N'], max_consecutive_nights: 3 }
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440004',
        employee_id: 'EMP004',
        first_name: 'Emma',
        last_name: 'Davis',
        email: 'emma.davis@security.com',
        phone: '07700123004',
        role: 'Control Room Operator',
        hire_date: '2023-03-01',
        hourly_rate: 15.50,
        is_active: true,
        is_shift_worker: true,
        max_hours_per_week: 45,
        min_hours_per_week: 28,
        days_off_per_week: 2,
        leave_allowance_days: 28,
        holiday_multiplier: 2.0,
        opted_out_wtd: false,
        eligible_shifts: ['D', 'N'],
        shift_preferences: { preferred_shifts: ['D'], avoid_weekends: true }
      },
      {
        id: '660e8400-e29b-41d4-a716-446655440005',
        employee_id: 'EMP005',
        first_name: 'James',
        last_name: 'Wilson',
        email: 'james.wilson@security.com',
        phone: '07700123005',
        role: 'Security Officer',
        hire_date: '2023-03-15',
        hourly_rate: 14.50,
        is_active: true,
        is_shift_worker: true,
        max_hours_per_week: 48,
        min_hours_per_week: 35,
        days_off_per_week: 2,
        leave_allowance_days: 28,
        holiday_multiplier: 2.0,
        opted_out_wtd: true,
        eligible_shifts: ['E', 'L', 'N'],
        shift_preferences: { flexible: true }
      }
    ];

    // Insert staff profiles in batches to avoid foreign key issues
    for (const staff of sampleStaff) {
      const { error: insertError } = await supabase
        .from('staff_profiles')
        .insert({
          ...staff,
          user_id: '00000000-0000-0000-0000-000000000000' // Use a placeholder UUID that doesn't conflict
        });

      if (insertError) {
        logger.error(new Error(`Error inserting staff member ${staff.employee_id}`), { error: insertError });
        // Continue with other staff members even if one fails
      } else {
        logger.info(`Successfully created staff member: ${staff.first_name} ${staff.last_name}`);
      }
    }

    logger.info('Sample staff profile creation completed');
  } catch (error) {
    logger.error(new Error('Failed to create sample staff profiles'), { originalError: error });
    throw error;
  }
}

/**
 * Creates sample roster configurations
 */
export async function createSampleConfigurations() {
  logger.info('Creating sample roster configurations...');
  
  try {
    const { data: existingConfigs, error: checkError } = await supabase
      .from('roster_config')
      .select('id')
      .limit(1);

    if (checkError) {
      logger.error(new Error('Error checking existing configs'), { error: checkError });
      throw checkError;
    }

    if (existingConfigs && existingConfigs.length > 0) {
      logger.info('Sample configurations already exist, skipping creation');
      return;
    }

    const sampleConfigs = [
      {
        id: '770e8400-e29b-41d4-a716-446655440001',
        config_name: 'Standard 4-Week Pattern',
        cycle_length_weeks: 4,
        shift_type: '8h',
        operational_hours_per_day: 24,
        handshake_minutes: 15,
        start_date: '2024-01-01'
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440002',
        config_name: 'Extended 8-Week Pattern',
        cycle_length_weeks: 8,
        shift_type: '8h',
        operational_hours_per_day: 24,
        handshake_minutes: 30,
        start_date: '2024-02-01'
      },
      {
        id: '770e8400-e29b-41d4-a716-446655440003',
        config_name: '12-Hour Day/Night Pattern',
        cycle_length_weeks: 6,
        shift_type: '12h',
        operational_hours_per_day: 24,
        handshake_minutes: 0,
        start_date: '2024-03-01'
      }
    ];

    const { error: insertError } = await supabase
      .from('roster_config')
      .insert(sampleConfigs);

    if (insertError) {
      logger.error(new Error('Error inserting sample configurations'), { error: insertError });
      throw insertError;
    }

    logger.info('Sample configurations created successfully');
  } catch (error) {
    logger.error(new Error('Failed to create sample configurations'), { originalError: error });
    throw error;
  }
}

/**
 * Initialize all sample data
 */
export async function initializeSampleData() {
  logger.info('Initializing all sample data...');
  
  try {
    await createSampleStaffProfiles();
    await createSampleConfigurations();
    logger.info('All sample data initialization completed');
  } catch (error) {
    logger.error(new Error('Failed to initialize sample data'), { originalError: error });
    throw error;
  }
}
