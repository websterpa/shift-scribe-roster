import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { guardPatternUI } from "@/utils/debug/uiGuards/patternUiGuard";

interface Pattern {
  id: string;
  site_id: string;
  name: string;
  sequence: any; // JSON from database
  created_at: string;
}

export default function LegacyCreateRoster() {
  console.log("LegacyCreateRoster: component mount");
  
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPatternId, setSelectedPatternId] = useState<string>("");
  const [customPatternName, setCustomPatternName] = useState<string>("");

  useEffect(() => {
    let alive = true;
    
    (async () => {
      try {
        console.log("LegacyCreateRoster: fetching site patterns");
        
        // For now, use site_patterns directly until patterns_legacy view is available
        const { data, error } = await supabase
          .from("site_patterns")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        if (alive) {
          console.log("LegacyCreateRoster: loaded patterns", data?.length || 0);
          setPatterns(data || []);
        }
      } catch (e: any) {
        console.error("LegacyCreateRoster: error loading patterns", e);
        if (alive) {
          setError(e.message || "Failed to load patterns");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();
    
    return () => { 
      alive = false; 
    };
  }, []);

  useEffect(() => {
    // UI Guard for development diagnostics
    if (import.meta.env.DEV) {
      const container = document.getElementById("legacy-create-root");
      if (container && !loading) {
        setTimeout(() => guardPatternUI(container), 100);
      }
    }
  }, [loading, patterns]);

  const handlePatternSelect = (patternId: string) => {
    console.log("LegacyCreateRoster: pattern selected", patternId);
    setSelectedPatternId(patternId);
  };

  const handleCustomNameChange = (name: string) => {
    console.log("LegacyCreateRoster: custom pattern name changed", name);
    setCustomPatternName(name);
  };

  const renderPatternTokens = (sequence: any) => {
    if (!sequence) return "—";
    if (Array.isArray(sequence)) {
      return sequence.join("").slice(0, 20) + (sequence.join("").length > 20 ? "..." : "");
    }
    if (typeof sequence === 'string') {
      return sequence.slice(0, 20) + (sequence.length > 20 ? "..." : "");
    }
    return "—";
  };

  return (
    <div id="legacy-create-root" className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Roster</h1>
          <p className="text-muted-foreground">Legacy roster creation interface with simple pattern selection</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pattern Selection */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Select Pattern
              </label>
              <select 
                data-testid="pattern-selector" 
                className="w-full p-2 border rounded-md bg-background text-foreground"
                value={selectedPatternId}
                onChange={(e) => handlePatternSelect(e.target.value)}
                disabled={loading}
              >
                <option value="">Choose a pattern...</option>
                {patterns.map(pattern => (
                  <option key={pattern.id} value={pattern.id}>
                    {pattern.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <label className="block text-sm font-semibold mb-2 text-foreground">
                Custom Pattern Name
              </label>
              <input 
                data-testid="pattern-name-input" 
                className="w-full p-2 border rounded-md bg-background text-foreground"
                placeholder="e.g., 3D-3R-3N-3R"
                value={customPatternName}
                onChange={(e) => handleCustomNameChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional: Override pattern name for this roster
              </p>
            </div>
          </div>

          {/* Pattern Cards */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Available Patterns</h3>
            
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading patterns...
              </div>
            )}
            
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                <div className="text-destructive font-medium">Error Loading Patterns</div>
                <div className="text-sm text-muted-foreground mt-1">{error}</div>
              </div>
            )}
            
            <div className="grid gap-3">
              {patterns.map(pattern => (
                <div 
                  key={pattern.id} 
                  data-testid="pattern-card"
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedPatternId === pattern.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-card hover:bg-accent'
                  }`}
                  onClick={() => handlePatternSelect(pattern.id)}
                >
                  <div className="font-semibold text-foreground">{pattern.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {renderPatternTokens(pattern.sequence)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Array.isArray(pattern.sequence) ? pattern.sequence.length : 0} tokens
                  </div>
                </div>
              ))}
              
              {!loading && !error && patterns.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="font-medium">No Patterns Available</div>
                  <div className="text-sm mt-1">
                    Configure site patterns to get started
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-6 pt-6 border-t">
          <button
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            disabled={!selectedPatternId || loading}
          >
            Generate Roster
          </button>
          {selectedPatternId && (
            <p className="text-xs text-muted-foreground mt-2">
              Ready to generate with {patterns.find(p => p.id === selectedPatternId)?.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}