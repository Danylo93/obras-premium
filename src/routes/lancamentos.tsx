import { createFileRoute } from "@tanstack/react-router";
import { useProjects } from "@/hooks/useProjects";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/lancamentos")({
  component: LancamentosComponent,
});

function LancamentosComponent() {
  const { projects, isLoading } = useProjects();
  const [searchTerm, setSearchTerm] = useState("");

  const allExpenses = projects.flatMap(p => 
    p.expenses.map(e => ({ ...e, projectName: p.name, projectId: p.id }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredExpenses = allExpenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.projectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="md:pl-64 min-h-screen bg-[#F9FAFB] p-6 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">Lançamentos</h1>
          <p className="text-slate-500 font-medium italic">Histórico completo de todos os gastos em todas as obras.</p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar por descrição, obra ou categoria..." 
            className="pl-10 h-12 rounded-xl border-2 focus-visible:ring-primary font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b-2">
              <TableHead className="font-bold text-slate-700 uppercase text-[10px] tracking-widest">Data</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase text-[10px] tracking-widest">Descrição</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase text-[10px] tracking-widest">Obra</TableHead>
              <TableHead className="font-bold text-slate-700 uppercase text-[10px] tracking-widest">Categoria</TableHead>
              <TableHead className="text-right font-bold text-slate-700 uppercase text-[10px] tracking-widest">Valor</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.map((exp) => (
              <TableRow key={exp.id} className="hover:bg-slate-50/80 transition-colors group">
                <TableCell className="text-slate-500 font-medium">
                  {new Date(exp.date).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell className="font-bold text-slate-800">
                  {exp.description}
                </TableCell>
                <TableCell>
                  <Link 
                    to="/projects/$projectId"
                    params={{ projectId: exp.projectId }}
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                  >
                    {exp.projectName}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    {exp.category}
                  </span>
                </TableCell>
                <TableCell className="text-right font-black tabular-nums text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(exp.amount)}
                </TableCell>
                <TableCell>
                  <Link to="/projects/$projectId" params={{ projectId: exp.projectId }}>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filteredExpenses.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-medium italic">
                  Nenhum lançamento encontrado.
                </TableCell>
              </TableRow>
            )}
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20 animate-pulse text-slate-300">
                  Carregando lançamentos...
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
