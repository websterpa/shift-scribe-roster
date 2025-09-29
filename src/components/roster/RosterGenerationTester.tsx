import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { generateRoster, getDefaultRatePolicy, getDefaultRestRules, getDefaultGeneratorConfig } from "@/utils/roster/rosterGeneration";
import { toast } from "sonner";

export function RosterGenerationTester() {
  const [loading, setLoading] = useState(false);
  const [versionId, setVersionId] = useState("");
  const [monthISO, setMonthISO] = useState("2025-09");
  const [result, setResult] = useState<any>(null);

  const handleGenerate = async () => {
    if (!versionId.trim()) {
      toast.error("Please enter a roster version ID");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      console.log("🚀 Starting roster generation...");
      
      const summary = await generateRoster({
        supabase,
        rosterVersionId: versionId.trim(),
        monthISO: monthISO.trim(),
        ratePolicy: getDefaultRatePolicy(),
        restRules: getDefaultRestRules(),
        holidays: [],
        config: getDefaultGeneratorConfig(),
      });

      console.log("✅ Generation completed:", summary);
      setResult(summary);
      toast.success(`Generated ${summary.assignmentsInserted} assignments successfully!`);
    } catch (error: any) {
      console.error("❌ Generation failed:", error);
      toast.error(`Generation failed: ${error.message}`);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGetVersionIds = async () => {
    try {
      const { data, error } = await supabase
        .from("roster_versions")
        .select("id, version_name")
        .order("generated_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      console.log("Available version IDs:", data);
      toast.success("Check console for available version IDs");
    } catch (error: any) {
      toast.error(`Failed to fetch versions: ${error.message}`);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Roster Generation Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter roster version ID"
            value={versionId}
            onChange={(e) => setVersionId(e.target.value)}
          />
          <Button variant="outline" onClick={handleGetVersionIds}>
            Get IDs
          </Button>
        </div>
        
        <Input
          placeholder="Month (YYYY-MM)"
          value={monthISO}
          onChange={(e) => setMonthISO(e.target.value)}
        />
        
        <Button 
          onClick={handleGenerate} 
          disabled={loading}
          className="w-full"
        >
          {loading ? "Generating..." : "Generate Roster"}
        </Button>
        
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}