import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Étape cruciale : On force la vérification et la capture du token d'e-mail au chargement
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      } else {
        // Optionnel : si aucun token n'est détecté, on revérifie après un court instant
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setHasSession(true);
      }
    };
    
    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // On tente la mise à jour
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur de réinitialisation",
        description: error.message === "Auth session missing!" 
          ? "La session de récupération est manquante ou a expiré. Veuillez refaire une demande de lien."
          : error.message,
      });
    } else {
      toast({
        title: "Succès !",
        description: "Votre mot de passe a été modifié avec succès. Connectez-vous avec vos nouveaux identifiants.",
      });
      
      // On déconnecte proprement la session temporaire avant de rediriger
      await supabase.auth.signOut();
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
              placeholder="Votre nouveau mot de passe (6 caractères min.)"
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
