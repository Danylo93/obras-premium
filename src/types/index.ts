export type Category =
  | "Material"
  | "Mão de Obra"
  | "Gasolina"
  | "Insumos"
  | "Equipamentos"
  | "Outros";

export type ProjectStatus = "Em andamento" | "Concluído" | "Pausado";

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
  employeeName?: string;
  notes?: string;
  invoiceNumber?: string;
  paid?: boolean;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientPhone?: string;
  address?: string;
  expenses: Expense[];
  createdAt: string;
  startDate?: string;
  deadline?: string;
  status: ProjectStatus;
  budget?: number;
  notes?: string;
  completionPct?: number; // 0–100, physical completion manually set by user
}
