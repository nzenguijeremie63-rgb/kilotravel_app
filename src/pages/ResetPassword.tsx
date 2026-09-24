import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } else {
      toast({
        title: "Succès !",
        description: "Votre mot de passe a été modifié avec succès.",
      });
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-white p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground">Saisissez votre nouveau mot de passe ci-dessous.</p>
        </div>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Votre nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Mise à jour..." : "Enregistrer le mot de passe"}
          </Button>
        </form>
      </div>
    </div>
  );
}
