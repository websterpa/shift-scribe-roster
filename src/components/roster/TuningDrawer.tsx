import React, { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Settings, RotateCcw } from 'lucide-react';
import { loadTuning, saveTuning, resetTuning, DEFAULT_TUNING, type RosterTuning } from '@/features/roster/engine/tuning';
import { toast } from '@/hooks/use-toast';

export const TuningDrawer: React.FC = () => {
  const [tuning, setTuning] = useState<RosterTuning>(loadTuning());
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    saveTuning(tuning);
    toast({
      title: 'Tuning Saved',
      description: 'Engine parameters updated. Regenerate roster to apply changes.',
    });
    setOpen(false);
  };

  const handleReset = () => {
    const defaults = resetTuning();
    setTuning(defaults);
    toast({
      title: 'Reset to Defaults',
      description: 'All tuning parameters restored to default values.',
    });
  };

  const updateValue = (key: keyof RosterTuning, value: number) => {
    setTuning(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Engine Tuning
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Roster Engine Tuning</DrawerTitle>
          <DrawerDescription>
            Adjust fairness weights and rest constraints. Changes apply on next roster generation.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-6 overflow-y-auto">
          {/* Fairness Weights */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Fairness Weights</h3>
            
            <div className="space-y-2">
              <Label className="text-xs">
                Fairness Weight: {tuning.FAIRNESS_WEIGHT.toFixed(2)}
                <span className="text-muted-foreground ml-2">(0.2-0.4 recommended)</span>
              </Label>
              <Slider
                value={[tuning.FAIRNESS_WEIGHT]}
                onValueChange={([v]) => updateValue('FAIRNESS_WEIGHT', v)}
                min={0.1}
                max={0.5}
                step={0.05}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Night Balance Weight: {tuning.NIGHT_BALANCE_WEIGHT.toFixed(2)}
                <span className="text-muted-foreground ml-2">(0.2-0.4 recommended)</span>
              </Label>
              <Slider
                value={[tuning.NIGHT_BALANCE_WEIGHT]}
                onValueChange={([v]) => updateValue('NIGHT_BALANCE_WEIGHT', v)}
                min={0.1}
                max={0.5}
                step={0.05}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Preference Penalty: {tuning.PREFERENCE_PENALTY.toFixed(2)}
                <span className="text-muted-foreground ml-2">(0.1-0.2 recommended)</span>
              </Label>
              <Slider
                value={[tuning.PREFERENCE_PENALTY]}
                onValueChange={([v]) => updateValue('PREFERENCE_PENALTY', v)}
                min={0.05}
                max={0.3}
                step={0.05}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Distribution Penalty: {tuning.DISTRIBUTION_PENALTY.toFixed(2)}
                <span className="text-muted-foreground ml-2">(0.3-0.8 recommended)</span>
              </Label>
              <Slider
                value={[tuning.DISTRIBUTION_PENALTY]}
                onValueChange={([v]) => updateValue('DISTRIBUTION_PENALTY', v)}
                min={0.2}
                max={1.0}
                step={0.1}
              />
            </div>
          </div>

          {/* Rest Constraints */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Rest Constraints</h3>
            
            <div className="space-y-2">
              <Label className="text-xs">
                Min Rest Hours: {tuning.MIN_REST_HOURS}
                <span className="text-muted-foreground ml-2">(8-12 hours)</span>
              </Label>
              <Slider
                value={[tuning.MIN_REST_HOURS]}
                onValueChange={([v]) => updateValue('MIN_REST_HOURS', v)}
                min={8}
                max={12}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Max Consecutive Days: {tuning.MAX_CONSECUTIVE_DAYS}
                <span className="text-muted-foreground ml-2">(5-7 days)</span>
              </Label>
              <Slider
                value={[tuning.MAX_CONSECUTIVE_DAYS]}
                onValueChange={([v]) => updateValue('MAX_CONSECUTIVE_DAYS', v)}
                min={5}
                max={7}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Max Consecutive Nights: {tuning.MAX_CONSECUTIVE_NIGHTS}
                <span className="text-muted-foreground ml-2">(2-4 nights)</span>
              </Label>
              <Slider
                value={[tuning.MAX_CONSECUTIVE_NIGHTS]}
                onValueChange={([v]) => updateValue('MAX_CONSECUTIVE_NIGHTS', v)}
                min={2}
                max={4}
                step={1}
              />
            </div>
          </div>

          {/* Distribution Targets */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Distribution Targets (Per Cycle)</h3>
            
            <div className="space-y-2">
              <Label className="text-xs">
                Max Nights Per Cycle: {tuning.MAX_NIGHTS_PER_CYCLE}
                <span className="text-muted-foreground ml-2">(3-8 nights)</span>
              </Label>
              <Slider
                value={[tuning.MAX_NIGHTS_PER_CYCLE]}
                onValueChange={([v]) => updateValue('MAX_NIGHTS_PER_CYCLE', v)}
                min={3}
                max={8}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">
                Max Weekends Per Cycle: {tuning.MAX_WEEKENDS_PER_CYCLE}
                <span className="text-muted-foreground ml-2">(2-6 days)</span>
              </Label>
              <Slider
                value={[tuning.MAX_WEEKENDS_PER_CYCLE]}
                onValueChange={([v]) => updateValue('MAX_WEEKENDS_PER_CYCLE', v)}
                min={2}
                max={6}
                step={1}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
