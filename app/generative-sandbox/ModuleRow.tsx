'use client';

import { Badge, Switch } from '@beckharrisdesign/mvds';
import { Slider } from './Slider';
import { MODULE_BY_ID } from '@/lib/generative-sandbox/modules';
import type { StackEntry } from '@/lib/generative-sandbox/stack';

/**
 * One module in the stack: reorder controls, name, enable toggle, inline params.
 *
 * Parameters live in the row rather than a side panel so a module's settings are
 * read next to its position — cause beside effect (design.md, Decisions).
 */
export function ModuleRow({
  entry,
  index,
  total,
  onToggle,
  onMove,
  onParamChange,
  onParamCommit,
}: {
  entry: StackEntry;
  index: number;
  total: number;
  onToggle: () => void;
  onMove: (to: number) => void;
  onParamChange: (name: string, value: number) => void;
  onParamCommit: () => void;
}) {
  const def = MODULE_BY_ID.get(entry.module);
  if (!def) return null;

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-col leading-none">
          <button
            type="button"
            className="px-1 text-xs text-muted-foreground disabled:opacity-30"
            onClick={() => onMove(index - 1)}
            disabled={index === 0}
            aria-label={`Move ${def.label} earlier`}
          >
            ▲
          </button>
          <button
            type="button"
            className="px-1 text-xs text-muted-foreground disabled:opacity-30"
            onClick={() => onMove(index + 1)}
            disabled={index === total - 1}
            aria-label={`Move ${def.label} later`}
          >
            ▼
          </button>
        </div>

        <span className={entry.enabled ? 'text-sm' : 'text-sm text-muted-foreground'}>
          {def.label}
        </span>

        <span className="ml-auto" />
        <Switch
          checked={entry.enabled}
          onCheckedChange={onToggle}
          aria-label={`Enable ${def.label}`}
        />
      </div>

      {/* Params stay mounted while disabled — muting a module must not throw its
          settings away (specs/transform-module-stack, requirement 2). */}
      <div className={entry.enabled ? 'mt-3 space-y-3' : 'mt-3 space-y-3 opacity-50'}>
        {def.params.map((param) => (
          <div key={param.name} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label
                className="text-xs text-muted-foreground"
                htmlFor={`${entry.uid}-${param.name}`}
              >
                {param.label}
              </label>
              <Badge variant="outline" className="ml-auto">
                {entry.params[param.name]}
              </Badge>
            </div>
            <Slider
              id={`${entry.uid}-${param.name}`}
              label={`${def.label} ${param.label}`}
              value={entry.params[param.name]}
              min={param.min}
              max={param.max}
              step={param.step}
              onValueChange={(v) => onParamChange(param.name, v)}
              onValueCommit={onParamCommit}
            />
          </div>
        ))}
      </div>
    </li>
  );
}
