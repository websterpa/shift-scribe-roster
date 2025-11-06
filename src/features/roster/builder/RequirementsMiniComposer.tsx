import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyWeekdayToWeekend, weekendDiffersFromWeekday } from "./requirementsHelpers";

const SHIFT_CODES = {
  "8h": ["E", "L", "N"],
  "12h": ["D", "N"]
} as const;

const SHIFT_LABELS = {
  E: "Early",
  L: "Late", 
  N: "Night",
  D: "Day"
} as const;

type Framework = "8h" | "12h";
type DayType = "weekdays" | "saturday" | "sunday";
type ShiftCode = "E" | "L" | "N" | "D";

interface DayTypeValues {
  E: number;
  L: number;
  N: number;
  D: number;
}

interface RequirementsMiniComposerProps {
  framework: Framework;
  onFrameworkChange: (framework: Framework) => void;
  onChange: (requirementsByDay: Record<number, Record<string, number>>) => void;
}

export default function RequirementsMiniComposer({
  framework,
  onFrameworkChange,
  onChange
}: RequirementsMiniComposerProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<Record<DayType, DayTypeValues>>({
    weekdays: { E: 2, L: 2, N: 1, D: 2 },
    saturday: { E: 1, L: 1, N: 1, D: 1 },
    sunday: { E: 1, L: 1, N: 1, D: 1 },
  });

  const activeCodes = SHIFT_CODES[framework];

  // Quick presets
  function applyPreset(type: "even" | "split" | "nights") {
    const newValues = { ...values };
    
    if (type === "even") {
      // All days same values
      for (const dayType of ["weekdays", "saturday", "sunday"] as DayType[]) {
        activeCodes.forEach(code => {
          newValues[dayType][code] = 2;
        });
      }
    } else if (type === "split") {
      // Higher weekday, lower weekend
      activeCodes.forEach(code => {
        newValues.weekdays[code] = 2;
        newValues.saturday[code] = 1;
        newValues.sunday[code] = 1;
      });
    } else if (type === "nights") {
      // Nights only
      activeCodes.forEach(code => {
        const isNight = code === "N" || code === "D";
        newValues.weekdays[code] = isNight ? 2 : 0;
        newValues.saturday[code] = isNight ? 2 : 0;
        newValues.sunday[code] = isNight ? 2 : 0;
      });
    }
    
    setValues(newValues);
  }

  // Update specific value
  function updateValue(dayType: DayType, code: ShiftCode, val: number) {
    setValues(prev => ({
      ...prev,
      [dayType]: { ...prev[dayType], [code]: Math.max(0, Math.min(10, val)) }
    }));
  }

  // Copy weekday to weekend
  function handleCopyToWeekend() {
    const differs = weekendDiffersFromWeekday(values, framework);
    
    if (differs && !confirm('Overwrite Saturday & Sunday with Weekday values?')) {
      return;
    }
    
    if (!differs) {
      toast({
        title: "No changes needed",
        description: "Weekend already matches weekdays",
      });
      return;
    }
    
    const updated = copyWeekdayToWeekend(values, framework);
    setValues(updated);
    
    toast({
      title: "Requirements copied",
      description: "Weekend requirements now match weekdays",
    });
  }

  // Reset to defaults
  function handleReset() {
    setValues({
      weekdays: { E: 2, L: 2, N: 1, D: 2 },
      saturday: { E: 1, L: 1, N: 1, D: 1 },
      sunday: { E: 1, L: 1, N: 1, D: 1 },
    });
  }

  // Normalize to requirementsByDay (dow 0-6)
  const requirementsByDay = useMemo(() => {
    const out: Record<number, Record<string, number>> = {};
    
    // Map day types to day-of-week indices
    // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    for (let dow = 0; dow <= 6; dow++) {
      const dayType: DayType = 
        dow === 0 ? "sunday" : 
        dow === 6 ? "saturday" : 
        "weekdays";
      
      out[dow] = {};
      for (const code of activeCodes) {
        const needed = values[dayType][code] ?? 0;
        if (needed > 0) {
          out[dow][code] = needed;
        }
      }
    }
    
    return out;
  }, [values, activeCodes]);

  // Notify parent of changes
  useEffect(() => {
    onChange?.(requirementsByDay);
  }, [requirementsByDay, onChange]);

  // Calculate totals for display
  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    Object.values(requirementsByDay).forEach(day => {
      Object.entries(day).forEach(([code, count]) => {
        result[code] = (result[code] || 0) + count;
      });
    });
    return result;
  }, [requirementsByDay]);

  return (
    <div className="space-y-6">
      {/* Framework Selector */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Framework</Label>
        <div className="flex gap-3">
          {(["8h", "12h"] as Framework[]).map(fw => (
            <Button
              key={fw}
              type="button"
              variant={framework === fw ? "default" : "outline"}
              onClick={() => onFrameworkChange(fw)}
              className="flex-1"
            >
              {fw === "8h" ? "8-hour (E/L/N)" : "12-hour (D/N)"}
            </Button>
          ))}
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Quick Presets</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => applyPreset("even")}
          >
            Even coverage
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => applyPreset("split")}
          >
            Weekday/Weekend split
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => applyPreset("nights")}
          >
            Nights only
          </Button>
        </div>
      </div>

      {/* Day-type Sliders */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Staff Requirements</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyToWeekend}
            className="h-7 gap-1.5 text-xs"
          >
            <Copy className="h-3 w-3" />
            Copy weekday → weekend
          </Button>
        </div>
        <Card>
          <CardContent className="pt-4 space-y-4">
            {(["weekdays", "saturday", "sunday"] as DayType[]).map(dayType => (
              <div key={dayType} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize min-w-[80px]">
                    {dayType}
                  </span>
                  <div className="flex gap-3 flex-wrap flex-1">
                    {activeCodes.map(code => (
                      <div key={code} className="flex items-center gap-2">
                        <Badge variant="outline" className="min-w-[50px]">
                          {SHIFT_LABELS[code]}
                        </Badge>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={values[dayType][code]}
                          onChange={e => updateValue(dayType, code, Number(e.target.value))}
                          className="w-20 text-center"
                          data-testid={`composer-${dayType}-${code}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
        >
          Reset
        </Button>
        <div className="text-sm text-muted-foreground">
          Weekly totals: {activeCodes.map(c => `${c}:${totals[c] || 0}`).join(' • ')}
        </div>
      </div>
    </div>
  );
}
