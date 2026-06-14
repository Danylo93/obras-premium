import {
  addExpense,
  addProject,
  deleteExpense,
  deleteProject,
  updateExpense,
  updateProject,
  useProjectsStore,
} from "@/store/projects";

/** Acesso reativo à lista de obras + ações de escrita (identidade estável). */
export function useProjects() {
  const projects = useProjectsStore();
  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
