import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useProjects } from "@/hooks/useProjects";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, TrendingUp, DollarSign, Briefcase, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { projects, isLoading, addProject, deleteProject } = useProjects();
  const navigate = useNavigate();

  const totals = useMemo(() => {
    return projects.reduce((acc, p) => {
      const pTotal = p.expenses.reduce((sum, e) => sum + e.amount, 0);
      acc.total += pTotal;
      acc.budget += p.budget || 0;
      return acc;
    }, { total: 0, budget: 0 });
  }, [projects]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    projects.forEach(p => {
      p.expenses.forEach(e => {
        data[e.category] = (data[e.category] || 0) + e.amount;
      });
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [projects]);

  const projectData = useMemo(() => {
    return projects.map(p => ({
      name: p.name,
      total: p.expenses.reduce((sum, e) => sum + e.amount, 0)
    })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [projects]);

  if (isLoading) return <div className="p-10 animate-pulse bg-slate-100 h-screen md:pl-64" />;

  return (
    <div className="md:pl-64 min-h-screen bg-[#F9FAFB] p-6 space-y-10 pb-32">
      {/* Welcome & Global Stats */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Dashboard Premium</h1>
          <p className="text-slate-500 font-medium italic">Visão geral financeira de todas as suas obras.</p>
        </div>
        <AddProjectDialog onAdd={addProject} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Total Investido" value={totals.total} icon={DollarSign} color="bg-primary" />
        <StatsCard title="Orçamento Total" value={totals.budget} icon={TrendingUp} color="bg-emerald-500" />
        <StatsCard title="Obras Ativas" value={projects.length} icon={Briefcase} color="bg-amber-500" isCurrency={false} />
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Gastos por Categoria">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState />
          )}
        </ChartCard>

        <ChartCard title="Top 5 Obras (Gasto)">
          {projectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fontWeight: 700 }} />
                <Tooltip formatter={(v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)} />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState />
          )}
        </ChartCard>
      </div>

      {/* Projects Grid */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-800">Suas Obras</h2>
          <Link to="/lancamentos" className="text-primary font-bold text-sm flex items-center gap-1 hover:underline">
            Ver Lançamentos <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => {
            const total = p.expenses.reduce((acc, curr) => acc + curr.amount, 0);
            return (
              <div 
                key={p.id} 
                onClick={() => navigate({ to: "/projects/$projectId", params: { projectId: p.id } })}
                className="group relative bg-white rounded-2xl border-2 border-transparent hover:border-primary shadow-sm hover:shadow-xl p-6 transition-all cursor-pointer hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-md uppercase tracking-wider">
                    {p.status}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Excluir obra?")) deleteProject(p.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1 group-hover:text-primary transition-colors truncate">{p.name}</h3>
                <p className="text-sm font-medium text-slate-400 mb-8 truncate">Cliente: {p.clientName}</p>
                <div className="pt-4 border-t flex justify-between items-end">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Total Gasto</span>
                  <span className="text-2xl font-black text-slate-800 tabular-nums">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                  </span>
                </div>
              </div>
            );
          })}
          
          {projects.length === 0 && (
            <div className="col-span-full py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-6 shadow-sm">
              <p className="text-slate-500 font-medium">Nenhuma obra cadastrada ainda.</p>
              <AddProjectDialog onAdd={addProject} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color, isCurrency = true }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
      <div className={`${color} p-4 rounded-xl shadow-lg shadow-${color}/20`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-2xl font-black text-slate-800 tabular-nums">
          {isCurrency ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : value}
        </p>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">{title}</h3>
      {children}
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="h-[300px] flex items-center justify-center text-slate-400 font-medium italic">
      Sem dados suficientes para gerar o gráfico.
    </div>
  );
}

function AddProjectDialog({ onAdd }: { onAdd: (name: string, client: string, budget?: number) => void }) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [budget, setBudget] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && client) {
      onAdd(name, client, budget ? parseFloat(budget) : undefined);
      setName('');
      setClient('');
      setBudget('');
      setOpen(false);
      toast.success("Obra criada com sucesso!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-12 px-8 rounded-xl font-bold text-md shadow-xl hover:shadow-primary/20 hover:scale-[1.02] transition-all gap-2">
          <Plus className="w-5 h-5" /> Nova Obra
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Novo Projeto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-bold uppercase tracking-wider text-slate-500">Nome da Obra</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Reforma Mansão Marazul" className="h-12 rounded-lg border-2 font-medium" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client" className="text-sm font-bold uppercase tracking-wider text-slate-500">Nome do Cliente</Label>
            <Input id="client" value={client} onChange={e => setClient(e.target.value)} placeholder="Ex: Dr. Fernando Costa" className="h-12 rounded-lg border-2 font-medium" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget" className="text-sm font-bold uppercase tracking-wider text-slate-500">Orçamento Estimado</Label>
            <Input id="budget" type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="R$ 0,00" className="h-12 rounded-lg border-2 font-medium" />
          </div>
          <Button type="submit" className="w-full h-14 rounded-xl font-bold text-lg shadow-lg">Começar Agora</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
