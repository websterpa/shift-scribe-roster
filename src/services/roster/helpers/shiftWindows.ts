/* Migrated from utils/roster — canonical version */

/**
 * Shift Window Resolution
 * 
 * Resolves shift tokens to time windows based on site start times.
 * 
 * @module services/roster/helpers/shiftWindows
 */

export function resolveShiftWindow(
  token: "D"|"N"|"E"|"L", 
  siteStart = 6
) {
  const pad = (n: number) => String(n).padStart(2, "0");
  
  if (token === "D") return { 
    start: `${pad(siteStart)}:00`, 
    end: `${pad((siteStart + 12) % 24)}:00`, 
    overnight: false 
  };
  if (token === "N") return { 
    start: `${pad((siteStart + 16) % 24)}:00`, 
    end: `${pad(siteStart)}:00`, 
    overnight: true 
  };
  if (token === "E") return { 
    start: `${pad(siteStart)}:00`, 
    end: `${pad((siteStart + 8) % 24)}:00`,  
    overnight: false 
  };
  if (token === "L") return { 
    start: `${pad((siteStart + 8) % 24)}:00`, 
    end: `${pad((siteStart + 16) % 24)}:00`, 
    overnight: false 
  };
  
  throw new Error(`Unknown token ${token}`);
}
