import { useState, type ReactNode } from "react";
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
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { addProject } from "@/store/projects";
import { parseAmount, todayInputValue } from "@/lib/format";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function AddProjectDialog({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState(todayInputValue());
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setName("");
    setClient("");
    setClientPhone("");
    setAddress("");
    setBudget("");
    setStartDate(todayInputValue());
    setDeadline("");
    setNotes("");
    setShowExtra(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let parsedBudget: number | undefined;
    if (budget.trim()) {
      parsedBudget = parseAmount(budget) ?? undefined;
      if (parsedBudget === undefined) {
        toast.error("Orçamento inválido — ex: 50000 ou 50.000,00");
        return;
      }
    }

    if (deadline && deadline < startDate) {
      toast.error("O prazo não pode ser anterior à data de início.");
      return;
    }

    addProject({
      name: name.trim(),
      clientName: client.trim(),
      clientPhone: clientPhone.trim() || undefined,
      address: address.trim() || undefined,
      budget: parsedBudget,
      startDate: startDate || undefined,
      deadline: deadline || undefined,
      notes: notes.trim() || undefined,
    });

    toast.success("Obra criada com sucesso!");
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {children ?? (
          <Button className="gap-2 font-bold shadow-md shadow-primary/20">
            <Plus className="h-4 w-4" /> Nova Obra
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="rounded-2xl sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Nova Obra</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Required fields */}
          <Field label="Nome da Obra" htmlFor="ap-name" required>
            <Input
              id="ap-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Reforma Residencial Jardins"
              className="h-11 rounded-xl border-2 font-medium"
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome do Cliente" htmlFor="ap-client" required>
              <Input
                id="ap-client"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Ex: Dr. Fernando Costa"
                className="h-11 rounded-xl border-2 font-medium"
                required
              />
            </Field>
            <Field label="Orçamento (R$)" htmlFor="ap-budget">
              <Input
                id="ap-budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ex: 80.000,00"
                className="h-11 rounded-xl border-2 font-medium"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data de Início" htmlFor="ap-start">
              <Input
                id="ap-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 rounded-xl border-2 font-medium"
              />
            </Field>
            <Field label="Prazo / Entrega" htmlFor="ap-deadline">
              <Input
                id="ap-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={startDate}
                className="h-11 rounded-xl border-2 font-medium"
              />
            </Field>
          </div>

          {/* Toggle for optional extra fields */}
          <button
            type="button"
            onClick={() => setShowExtra((v) => !v)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {showExtra ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showExtra ? "Menos opções" : "Mais opções (telefone, endereço, notas)"}
          </button>

          {showExtra && (
            <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Telefone do Cliente" htmlFor="ap-phone">
                  <Input
                    id="ap-phone"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="h-11 rounded-xl border-2 font-medium"
                  />
                </Field>
                <Field label="Endereço da Obra" htmlFor="ap-address">
                  <Input
                    id="ap-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro"
                    className="h-11 rounded-xl border-2 font-medium"
                  />
                </Field>
              </div>
              <Field label="Observações" htmlFor="ap-notes">
                <Textarea
                  id="ap-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas sobre o projeto, materiais especiais, avisos..."
                  className="min-h-[80px] rounded-xl border-2 font-medium resize-none"
                />
              </Field>
            </div>
          )}

          <Button type="submit" className="h-12 w-full rounded-xl font-bold text-base shadow-md">
            Criar Obra
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={htmlFor}
        className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
      >
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
