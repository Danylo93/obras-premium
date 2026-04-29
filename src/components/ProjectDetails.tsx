import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2, PieChart, Download } from "lucide-react";
import { Project, Expense, Category } from "@/types";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ProjectDetails({ 
  project, 
  onBack, 
  onAddExpense,
  onDeleteExpense
}: { 
  project: Project; 
  onBack: () => void;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>('Material');
  const [employeeName, setEmployeeName] = useState('');

  const handleAddExpense = () => {
    if (description && amount) {
      onAddExpense({
        id: crypto.randomUUID(),
        description,
        amount: parseFloat(amount),
        category,
        date: new Date().toISOString(),
        employeeName: category === 'Mão de Obra' ? employeeName : undefined
      });
      setDescription('');
      setAmount('');
      setEmployeeName('');
    }
  };

  const total = project.expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const exportCSV = () => {
    const headers = ["Descrição", "Categoria", "Funcionário", "Data", "Valor"];
    const rows = project.expenses.map(exp => [
      exp.description,
      exp.category,
      exp.employeeName || "",
      new Date(exp.date).toLocaleDateString('pt-BR'),
      exp.amount.toString()
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${project.name}_gastos.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartData = useMemo(() => {
    const data = project.expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [project.expenses]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Button variant="outline" onClick={exportCSV} className="flex gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{project.name}</h1>
          <p className="text-xl text-muted-foreground flex items-center gap-2">
            Cliente: <span className="font-semibold text-foreground">{project.clientName}</span>
          </p>
        </div>
        <Card className="bg-primary/5 border-primary/20 p-6 flex flex-col items-center justify-center min-w-[200px]">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Gasto Total</p>
          <p className="text-4xl font-black text-primary">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-0 bg-card">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><Plus className="w-5 h-5"/> Registrar Gasto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Cimento, Pintura..." />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={(v: Category) => setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Material', 'Mão de Obra', 'Gasolina', 'Insumos', 'Equipamentos', 'Outros'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {category === 'Mão de Obra' && (
                <div className="space-y-2">
                  <Label>Funcionário</Label>
                  <Input value={employeeName} onChange={e => setEmployeeName(e.target.value)} placeholder="Nome do funcionário" />
                </div>
              )}
            </div>
            <Button onClick={handleAddExpense} className="w-full h-12 font-bold shadow-md hover:shadow-lg transition-all">Adicionar Gasto</Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-card">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2"><PieChart className="w-5 h-5"/> Distribuição</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground italic">Sem dados ainda</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Funcionário</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {project.expenses.map((exp) => (
              <TableRow key={exp.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">{exp.description}</TableCell>
                <TableCell>{exp.category}</TableCell>
                <TableCell>{exp.employeeName || '-'}</TableCell>
                <TableCell>{new Date(exp.date).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.amount)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteExpense(exp.id)} className="text-destructive hover:bg-destructive/10 rounded-full">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
