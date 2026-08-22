import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="surface-card p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="text-stadium text-2xl sm:text-3xl">{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="surface-card p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-bold uppercase tracking-wide">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <select
        className="h-10 w-full rounded-md border border-border bg-surface px-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="p-3 text-sm text-muted-foreground">{children}</p>;
}

export function Scroller({ children }: { children: ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4">{children}</div>;
}

/** Confirmação simples ou com digitação obrigatória (operações destrutivas). */
export function ConfirmButton({
  label,
  title,
  description,
  confirmWord,
  onConfirm,
  variant = "destructive",
  size = "sm",
  className,
  disabled,
}: {
  label: ReactNode;
  title: string;
  description: string;
  confirmWord?: string;
  onConfirm: () => void;
  variant?: "default" | "secondary" | "destructive" | "outline";
  size?: "sm" | "default";
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const blocked = !!confirmWord && typed.trim().toUpperCase() !== confirmWord.toUpperCase();

  return (
    <>
      <Button type="button" size={size} variant={variant} className={className} disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ {title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirmWord && (
            <div className="space-y-1">
              <Label className="text-xs">
                Digite <span className="font-bold text-foreground">{confirmWord}</span> para confirmar
              </Label>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={confirmWord} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTyped("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={blocked}
              onClick={() => {
                if (blocked) return;
                setTyped("");
                onConfirm();
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
