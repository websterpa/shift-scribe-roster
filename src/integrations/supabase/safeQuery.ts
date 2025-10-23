import { toast } from "@/hooks/use-toast";
import { createLogger } from "@/utils/errorLogger";

const logger = createLogger('SupabaseSafeQuery');

type QueryResult<T> = { data: T | null; error: Error | null };

/**
 * Safe wrapper for Supabase SELECT queries.
 * Logs errors, shows toast notification, and returns { data, error }.
 */
export async function safeSelect<T>(
  queryBuilder: any,
  context?: string
): Promise<QueryResult<T>> {
  try {
    const { data, error } = await queryBuilder;
    
    if (error) {
      const msg = `Query failed${context ? ` (${context})` : ''}: ${error.message}`;
      logger.error(new Error(msg), { error, context });
      toast({
        title: "Database Error",
        description: context ? `Failed to load ${context}` : "Failed to load data",
        variant: "destructive",
      });
      return { data: null, error: new Error(msg) };
    }
    
    return { data: data as T, error: null };
  } catch (err: any) {
    const msg = `Query exception${context ? ` (${context})` : ''}: ${err.message}`;
    logger.error(new Error(msg), { err, context });
    toast({
      title: "Database Error",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    return { data: null, error: err };
  }
}

/**
 * Safe wrapper for Supabase INSERT queries.
 * Logs errors, shows toast notification, and returns { data, error }.
 */
export async function safeInsert<T>(
  queryBuilder: any,
  context?: string
): Promise<QueryResult<T>> {
  try {
    const { data, error } = await queryBuilder;
    
    if (error) {
      const msg = `Insert failed${context ? ` (${context})` : ''}: ${error.message}`;
      logger.error(new Error(msg), { error, context });
      toast({
        title: "Save Failed",
        description: context ? `Failed to create ${context}` : "Failed to save data",
        variant: "destructive",
      });
      return { data: null, error: new Error(msg) };
    }
    
    return { data: data as T, error: null };
  } catch (err: any) {
    const msg = `Insert exception${context ? ` (${context})` : ''}: ${err.message}`;
    logger.error(new Error(msg), { err, context });
    toast({
      title: "Save Failed",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    return { data: null, error: err };
  }
}

/**
 * Safe wrapper for Supabase UPDATE queries.
 * Logs errors, shows toast notification, and returns { data, error }.
 */
export async function safeUpdate<T>(
  queryBuilder: any,
  context?: string
): Promise<QueryResult<T>> {
  try {
    const { data, error } = await queryBuilder;
    
    if (error) {
      const msg = `Update failed${context ? ` (${context})` : ''}: ${error.message}`;
      logger.error(new Error(msg), { error, context });
      toast({
        title: "Update Failed",
        description: context ? `Failed to update ${context}` : "Failed to update data",
        variant: "destructive",
      });
      return { data: null, error: new Error(msg) };
    }
    
    return { data: data as T, error: null };
  } catch (err: any) {
    const msg = `Update exception${context ? ` (${context})` : ''}: ${err.message}`;
    logger.error(new Error(msg), { err, context });
    toast({
      title: "Update Failed",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    return { data: null, error: err };
  }
}

/**
 * Safe wrapper for Supabase DELETE queries.
 * Logs errors, shows toast notification, and returns { data, error }.
 */
export async function safeDelete<T>(
  queryBuilder: any,
  context?: string
): Promise<QueryResult<T>> {
  try {
    const { data, error } = await queryBuilder;
    
    if (error) {
      const msg = `Delete failed${context ? ` (${context})` : ''}: ${error.message}`;
      logger.error(new Error(msg), { error, context });
      toast({
        title: "Delete Failed",
        description: context ? `Failed to delete ${context}` : "Failed to delete data",
        variant: "destructive",
      });
      return { data: null, error: new Error(msg) };
    }
    
    return { data: data as T, error: null };
  } catch (err: any) {
    const msg = `Delete exception${context ? ` (${context})` : ''}: ${err.message}`;
    logger.error(new Error(msg), { err, context });
    toast({
      title: "Delete Failed",
      description: "An unexpected error occurred",
      variant: "destructive",
    });
    return { data: null, error: err };
  }
}
