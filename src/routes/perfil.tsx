import { createFileRoute } from "@tanstack/react-router";
import { User, Crown, Shield, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/perfil")({
  component: ProfileComponent,
});

function ProfileComponent() {
  return (
    <div className="md:pl-64 min-h-screen bg-[#F9FAFB] p-6 space-y-10 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black text-slate-800">Seu Perfil</h1>
        <p className="text-slate-500 font-medium italic">Configurações da sua conta premium.</p>
      </header>

      <div className="max-w-2xl space-y-6">
        <div className="bg-white p-8 rounded-2xl border shadow-sm flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <User className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">Marcos Moreira</h2>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold text-amber-600 uppercase tracking-tighter">Assinante Premium</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <ProfileItem icon={Shield} label="Segurança" detail="Senha e Autenticação" />
          <ProfileItem icon={Settings} label="Preferências" detail="Tema, Idioma e Notificações" />
          <div className="p-4 border-t">
            <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 font-bold gap-3 h-12 rounded-xl">
              <LogOut className="w-5 h-5" /> Sair da Conta
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, detail }: any) {
  return (
    <button className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors border-b last:border-0 group">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-white group-hover:shadow-md transition-all">
          <Icon className="w-6 h-6 text-slate-500" />
        </div>
        <div className="text-left">
          <p className="font-bold text-slate-800">{label}</p>
          <p className="text-xs text-slate-400 font-medium">{detail}</p>
        </div>
      </div>
      <div className="w-8 h-8 rounded-full border flex items-center justify-center group-hover:border-primary group-hover:text-primary transition-colors">
        <Shield className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        <span className="text-slate-300 group-hover:hidden">→</span>
      </div>
    </button>
  );
}
