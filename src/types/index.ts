export type Category = 'Material' | 'Mão de Obra' | 'Gasolina' | 'Insumos' | 'Equipamentos' | 'Outros';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
  employeeName?: string;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  expenses: Expense[];
  createdAt: string;
  status: 'Em andamento' | 'Concluído' | 'Pausado';
  budget?: number;
}
