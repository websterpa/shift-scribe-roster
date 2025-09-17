import type { GenerateRosterResult } from "@/types/managerUI";

export function budgetVarianceToastData(
  result: GenerateRosterResult,
  threshold: number = 0
): { 
  title: string; 
  description: string; 
  variant: "default" | "destructive" 
} | null {
  if (!result?.ok || !result.summary) return null;
  
  const { budget, budgetVariance } = result.summary;
  
  if (typeof budget !== "number" || typeof budgetVariance !== "number") return null;
  
  if (budgetVariance > threshold) {
    return { 
      title: "Budget Warning",
      description: `Over budget by £${Math.abs(budgetVariance).toLocaleString()}`,
      variant: "destructive" 
    };
  }
  
  if (budgetVariance < 0) {
    return { 
      title: "Great News!",
      description: `Under budget by £${Math.abs(budgetVariance).toLocaleString()}`,
      variant: "default" 
    };
  }
  
  return null; // exactly on budget or within threshold
}