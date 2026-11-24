import { useId } from "react";
import { Checkbox, Input } from "@beckharrisdesign/mvds";
import type { PartNaming } from "@/lib/pdf-split-plan";
import type { ShownValues } from "@/lib/pdf-shown-values";

/**
 * What a split's files will be called and what they take from the scan — Figma
 * `02.15`, frames 83:24 (already tagged) and 83:189 (not tagged yet).
 * openspec/changes/pdf-metadata-viewer-cloud — task 7g.
 *
 * Works the same whether or not the scan was tagged first: its title is only
 * where the Title field starts.
 */

export interface Copied {
  subject: boolean;
  author: boolean;
  keywords: boolean;
}

interface OptionProps {
  label: string;
  note?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}

function Option({ label, note, checked, disabled, onChange }: OptionProps) {
  const id = useId();
  return (
    <div className={`flex min-h-11 items-center gap-2.5 ${disabled ? "opacity-60" : ""}`}>
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(on) => onChange(on === true)}
        // The default outline all but vanishes on this green.
        className="border-muted-foreground data-[state=checked]:border-primary"
      />
      <label htmlFor={id} className="text-sm text-text-primary">
        {label}
      </label>
      {note ? (
        <span className="min-w-0 text-sm [overflow-wrap:anywhere] text-muted-foreground">{note}</span>
      ) : null}
    </div>
  );
}

interface SplitPanelProps {
  parts: Array<[number, number]>;
  naming: PartNaming[];
  values: ShownValues;
  title: string;
  onTitle: (title: string) => void;
  number: boolean;
  canNumber: boolean;
  onNumber: (on: boolean) => void;
  nameFromTitle: boolean;
  canName: boolean;
  onNameFromTitle: (on: boolean) => void;
  /** What's in a part's title field: as typed, spaces and all. */
  titleOf: (firstPage: number, index: number) => string;
  onPartTitle: (firstPage: number, title: string) => void;
  copied: Copied;
  onCopied: (copied: Copied) => void;
  disabled: boolean;
}

export function SplitPanel({
  parts,
  naming,
  values,
  title,
  onTitle,
  number,
  canNumber,
  onNumber,
  nameFromTitle,
  canName,
  onNameFromTitle,
  titleOf,
  onPartTitle,
  copied,
  onCopied,
  disabled,
}: SplitPanelProps) {
  const titleId = useId();
  const fields: { key: keyof Copied; label: string; value: string }[] = [
    { key: "keywords", label: "Keywords", value: values.keywords.join(", ") },
    { key: "subject", label: "Subject", value: values.subject ?? "" },
    { key: "author", label: "Author", value: values.author ?? "" },
  ];
  const anything = fields.some((f) => f.value);
  const inputClass =
    "min-h-11 w-full bg-background-primary text-base dark:bg-background-primary lg:text-sm";

  return (
    <>
      <h3 aria-live="polite" className="text-base font-semibold text-text-primary">
        Creates {parts.length} files in the same Drive folder
      </h3>

      <div className="flex flex-col gap-5 lg:flex-row lg:gap-12">
        <div className="flex flex-col gap-1 lg:w-[560px]">
          <label htmlFor={titleId} className="text-xs font-medium text-muted-foreground">
            Title
          </label>
          <Input
            id={titleId}
            size="lg"
            value={title}
            maxLength={500}
            placeholder="What are these? (optional)"
            autoComplete="off"
            disabled={disabled}
            onChange={(e) => onTitle(e.target.value)}
            className={inputClass}
          />
          <Option label="Number the parts" checked={number} disabled={disabled || !canNumber} onChange={onNumber} />
          <Option
            label="Name the files after their titles"
            checked={nameFromTitle}
            disabled={disabled || !canName}
            onChange={onNameFromTitle}
          />
          {canName ? null : (
            <p className="text-xs text-muted-foreground">Without a title, files keep the scan&apos;s name.</p>
          )}
        </div>

        <fieldset className="flex min-w-0 flex-col lg:flex-1">
          <legend className="text-xs font-medium text-muted-foreground">Copy to every part</legend>
          {anything ? (
            fields.map((f) => (
              <Option
                key={f.key}
                label={f.label}
                note={f.value || "Nothing to copy"}
                checked={copied[f.key] && f.value !== ""}
                disabled={disabled || f.value === ""}
                onChange={(on) => onCopied({ ...copied, [f.key]: on })}
              />
            ))
          ) : (
            <p className="pt-2 text-sm text-muted-foreground">
              Nothing to copy: this scan has no subject, author or keywords yet.
            </p>
          )}
        </fieldset>
      </div>

      {/* On a phone each file is a short stack: name, title, pages. */}
      <table className="block w-full text-left text-sm lg:table lg:table-fixed">
        <thead className="hidden text-xs lg:table-header-group">
          <tr>
            <th scope="col" className="w-[34%] py-2 pr-4 font-medium text-muted-foreground">
              File name
            </th>
            <th scope="col" className="px-4 py-2 font-medium text-muted-foreground">
              Title
            </th>
            <th scope="col" className="w-[110px] py-2 pl-4 text-right font-medium text-muted-foreground">
              Pages
            </th>
          </tr>
        </thead>
        <tbody className="block lg:table-row-group">
          {parts.map(([first, last], i) => (
            <tr
              key={first}
              className="flex flex-col gap-2 border-t border-border py-3 align-top lg:table-row"
            >
              <td className="[overflow-wrap:anywhere] text-text-primary lg:pt-5 lg:pr-4 lg:pb-3">
                {naming[i].filename}
              </td>
              <td className="lg:px-4 lg:py-2">
                <Input
                  size="lg"
                  aria-label={`Title of file ${i + 1}`}
                  value={titleOf(first, i)}
                  maxLength={500}
                  placeholder="Untitled"
                  autoComplete="off"
                  disabled={disabled}
                  onChange={(e) => onPartTitle(first, e.target.value)}
                  className={inputClass}
                />
              </td>
              <td className="tabular-nums text-muted-foreground lg:pt-5 lg:pb-3 lg:pl-4 lg:text-right">
                <span className="lg:hidden">{first === last ? "Page " : "Pages "}</span>
                {first === last ? first : `${first}–${last}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
