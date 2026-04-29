import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ProjectDetails from "@/components/ProjectDetails";
import { useProjects } from "@/hooks/useProjects";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailComponent,
});

function ProjectDetailComponent() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const { projects, addExpense, deleteExpense, isLoading } = useProjects();

  const selectedProject = projects.find(p => p.id === projectId);

  if (isLoading) return <div className="p-10 animate-pulse bg-slate-100 h-screen" />;
  
  if (!selectedProject) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-bold">Projeto não encontrado</h2>
        <button onClick={() => navigate({ to: "/" })} className="mt-4 text-primary font-bold">Voltar</button>
      </div>
    );
  }

  return (
    <div className="md:pl-64">
      <ProjectDetails 
        project={selectedProject} 
        onBack={() => navigate({ to: "/" })} 
        onAddExpense={(exp) => addExpense(selectedProject.id, exp)}
        onDeleteExpense={(expId) => deleteExpense(selectedProject.id, expId)}
      />
    </div>
  );
}
