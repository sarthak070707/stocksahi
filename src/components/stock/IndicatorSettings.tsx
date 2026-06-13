/**
 * IndicatorSettings.tsx
 *
 * Settings panel for one active indicator (opened by the gear on its chip).
 * Renders the right control for each tunable parameter the indicator declares —
 * number inputs (length, std dev), dropdowns (source, smoothing), and colour
 * pickers — and applies changes live so the chart updates as you tweak.
 */

"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  type IndicatorDef,
  type ParamValues,
  defaultParams,
} from "@/lib/indicator-registry";

interface IndicatorSettingsProps {
  def: IndicatorDef | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: ParamValues;
  onChange: (params: ParamValues) => void;
  portalContainer?: HTMLElement | null;
}

export function IndicatorSettings({
  def,
  open,
  onOpenChange,
  values,
  onChange,
  portalContainer,
}: IndicatorSettingsProps) {
  const [local, setLocal] = useState<ParamValues>(values);

  // Sync when a different indicator is opened.
  useEffect(() => {
    setLocal(values);
  }, [values, def?.id]);

  if (!def || !def.params || def.params.length === 0) return null;

  const set = (key: string, value: number | string | boolean) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next); // live apply
  };

  const resetDefaults = () => {
    const d = defaultParams(def);
    setLocal(d);
    onChange(d);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" portalContainer={portalContainer}>
        <DialogHeader>
          <DialogTitle className="text-base">
            {def.name.replace(/ \(.*\)/, "")} settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          {def.params.map((spec) => (
            <div key={spec.key} className="flex items-center justify-between gap-3">
              <label className="text-sm text-muted-foreground">{spec.label}</label>

              {spec.control === "number" && (
                <Input
                  type="number"
                  value={String(local[spec.key] ?? spec.default)}
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  onChange={(e) => {
                    const v = e.target.value === "" ? "" : Number(e.target.value);
                    set(spec.key, v as number);
                  }}
                  className="w-28 h-9"
                />
              )}

              {spec.control === "select" && (
                <select
                  value={String(local[spec.key] ?? spec.default)}
                  onChange={(e) => set(spec.key, e.target.value)}
                  className="w-28 h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {spec.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}

              {spec.control === "color" && (
                <input
                  type="color"
                  value={String(local[spec.key] ?? spec.default)}
                  onChange={(e) => set(spec.key, e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                />
              )}

              {spec.control === "toggle" && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(local[spec.key] ?? spec.default)}
                  onClick={() => set(spec.key, !(local[spec.key] ?? spec.default))}
                  className={`relative h-6 w-11 rounded-full transition-smooth ${
                    (local[spec.key] ?? spec.default) ? "bg-emerald-600" : "bg-input"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-smooth ${
                      (local[spec.key] ?? spec.default) ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <Button variant="ghost" size="sm" onClick={resetDefaults} className="text-muted-foreground">
            Reset to defaults
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
