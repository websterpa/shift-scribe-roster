
import { toast } from '@/hooks/use-toast';

export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateForm(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
  const errors: Record<string, string> = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors[field] = `${field.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()} is required`;
      continue;
    }
    
    // Skip other validations if field is empty and not required
    if (!value && !rules.required) continue;
    
    // Min validation
    if (rules.min !== undefined) {
      if (typeof value === 'number' && value < rules.min) {
        errors[field] = `${field.replace(/_/g, ' ')} must be at least ${rules.min}`;
      } else if (typeof value === 'string' && value.length < rules.min) {
        errors[field] = `${field.replace(/_/g, ' ')} must be at least ${rules.min} characters`;
      }
    }
    
    // Max validation
    if (rules.max !== undefined) {
      if (typeof value === 'number' && value > rules.max) {
        errors[field] = `${field.replace(/_/g, ' ')} must be at most ${rules.max}`;
      } else if (typeof value === 'string' && value.length > rules.max) {
        errors[field] = `${field.replace(/_/g, ' ')} must be at most ${rules.max} characters`;
      }
    }
    
    // Pattern validation
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors[field] = `${field.replace(/_/g, ' ')} format is invalid`;
    }
    
    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        errors[field] = customError;
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function showValidationToast(errors: Record<string, string>) {
  const errorCount = Object.keys(errors).length;
  const firstError = Object.values(errors)[0];
  
  toast({
    title: "Validation Error",
    description: errorCount === 1 ? firstError : `${errorCount} validation errors found`,
    variant: "destructive",
  });
}

export function showSuccessToast(message: string) {
  toast({
    title: "Success",
    description: message,
  });
}

// Common validation schemas - updated to match form field names
export const staffValidationSchema: ValidationSchema = {
  first_name: { required: true, min: 2, max: 50 },
  last_name: { required: true, min: 2, max: 50 },
  email: { 
    required: true, 
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value) => {
      if (!value.includes('@')) return 'Email must contain @ symbol';
      return null;
    }
  },
  employee_id: { required: true, min: 3, max: 20 },
  hourly_rate: { 
    required: true, 
    min: 0, 
    max: 200,
    custom: (value) => {
      if (isNaN(value)) return 'Hourly rate must be a number';
      return null;
    }
  }
};

export const configValidationSchema: ValidationSchema = {
  configName: { required: true, min: 3, max: 100 },
  cycleLength: { 
    required: true, 
    min: 1, 
    max: 52,
    custom: (value) => {
      if (!Number.isInteger(Number(value))) return 'Cycle length must be a whole number';
      return null;
    }
  },
  operationalHours: { 
    required: true, 
    min: 1, 
    max: 24,
    custom: (value) => {
      if (!Number.isInteger(Number(value))) return 'Operational hours must be a whole number';
      return null;
    }
  }
};
