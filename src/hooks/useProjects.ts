import { useState, useEffect } from "react";
import { Project, Expense } from "@/types";

// Persistence abstraction
const storage = {
  getItem: async (key: string) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  setItem: async (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage.getItem("obras_projects_v2").then(data => {
      if (data) setProjects(data);
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      storage.setItem("obras_projects_v2", projects);
    }
  }, [projects, isLoading]);

  const addProject = (name: string, clientName: string, budget?: number) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      clientName,
      expenses: [],
      createdAt: new Date().toISOString(),
      status: 'Em andamento',
      budget
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const addExpense = (projectId: string, expense: Expense) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, expenses: [...p.expenses, expense] }
        : p
    ));
  };

  const deleteExpense = (projectId: string, expenseId: string) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, expenses: p.expenses.filter(e => e.id !== expenseId) }
        : p
    ));
  };

  return {
    projects,
    isLoading,
    addProject,
    deleteProject,
    addExpense,
    deleteExpense
  };
}
