import { useState, useEffect, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/categories";
import { parseAmount, todayInputValue, dateInputToISO, isoToDateInput } from "@/lib/format";
import type { Category, Expense } from "@/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
  mode?: "add" | "edit";
  initialData?: Expense;
  onSave: (data: Omit<Expense, "id">) => void;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  trigger,
  mode = "add",
  initialData,
  onSave,
}: Props) {
  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [category, setCategory] = useState<Category>("Material");
  const [employeeName, setEmployeeName] = useState("");
  const [dateValue, setDateValue] = useState(todayInputValue());
  const [notes, setNotes] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setDescription(initialData.description);
        setAmountText(String(initialData.amount).replace(".", ","));
        setCategory(initialData.category);
        setEmployeeName(initialData.employeeName ?? "");
        setDateValue(isoToDateInput(initialData.date));
        setNotes(initialData.notes ?? "");
        setInvoiceNumber(initialData.invoiceNumber ?? "");
        setPaid(initialData.paid ?? false);
      } else {
        setDescription("");
        setAmountText("");
        setCategory("Material");
        setEmployeeName("");
        setDateValue(todayInputValue());
        setNotes("");
        setInvoiceNumber("");
        setPaid(false);
      }
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmount(amountText);
    if (amount === null) {
      toast.error("Valor inválido — use um número positivo, ex: 250,00");
      return;
    }

    onSave({
      description: description.trim(),
      amount,
      category,
      date: dateInputToISO(dateValue),
      employeeName:
        category === "Mão de Obra" && employeeName.trim() ? employeeName.trim() : undefined,
      notes: notes.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      paid,
    });
    onOpenChange(false);
  };

  const title = mode === "edit" ? "Editar Gasto" : "Registrar Gasto";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="rounded-2xl sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Description — full width */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Cimento CP-II, 50 sacos"
              className="h-11 rounded-xl border-2 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Valor (R$) <span className="text-destructive">*</span>
              </Label>
              <Input
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                placeholder="Ex: 3.500,00"
                className="h-11 rounded-xl border-2 font-medium"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Data
              </Label>
              <Input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="h-11 rounded-xl border-2 font-medium"
              />
            </div>
          </div>

          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: category === "Mão de Obra" ? "1fr 1fr" : "1fr",
            }}
          >
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Categoria
              </Label>
              <Select value={category} onValueChange={(v: Category) => setCategory(v)}>
                <SelectTrigger className="h-11 rounded-xl border-2 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="font-medium">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {category === "Mão de Obra" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Funcionário
                </Label>
                <Input
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Nome do profissional"
                  className="h-11 rounded-xl border-2 font-medium"
                />
              </div>
            )}
          </div>

          {/* Optional: invoice + notes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nº Nota Fiscal
              </Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ex: NF-0042"
                className="h-11 rounded-xl border-2 font-medium"
              />
            </div>
            <div className="col-span-1 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Observações
              </Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionais"
                className="h-11 rounded-xl border-2 font-medium"
              />
            </div>
          </div>

          {/* Paid toggle */}
          <button
            type="button"
            onClick={() => setPaid((v) => !v)}
            className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 transition-all ${
              paid
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border text-muted-foreground hover:border-border/80"
            }`}
          >
            <span className="text-sm font-bold">
              {paid ? "✓ Pagamento efetuado" : "Pagamento pendente"}
            </span>
            <span className={`h-5 w-9 rounded-full transition-all ${paid ? "bg-emerald-500" : "bg-muted"} relative flex items-center`}>
              <span className={`absolute h-4 w-4 rounded-full bg-white shadow transition-all ${paid ? "left-4" : "left-0.5"}`} />
            </span>
          </button>

          <Button type="submit" className="h-12 w-full rounded-xl font-bold text-base shadow-md">
            {mode === "edit" ? "Salvar Alterações" : "Adicionar Gasto"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
