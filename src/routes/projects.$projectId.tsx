import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useProjectsStore } from "@/store/projects";
import ProjectDetails from "@/components/ProjectDetails";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectDetailRoute,
});

function ProjectDetailRoute() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const projects = useProjectsStore();

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-10 text-center">
        <p className="text-2xl font-black text-foreground">Obra não encontrada</p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-sm font-bold text-primary hover:underline"
        >
          Voltar ao Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="md:pl-0">
      <ProjectDetails project={project} onBack={() => navigate({ to: "/" })} />
    </div>
  );
}
