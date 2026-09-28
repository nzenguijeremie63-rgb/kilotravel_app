import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isCarrier: boolean;
  isPendingCarrier: boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCarrier, setIsCarrier] = useState(false);
  const [isPendingCarrier, setIsPendingCarrier] = useState(false);

  const checkRoles = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      const role = profile?.role;
      setIsAdmin(role === 'admin');
      setIsCarrier(role === 'carrier');

      // Check pending carrier application only if not already a carrier
      if (role !== 'carrier') {
        const { data: application } = await supabase
          .from('carrier_applications')
          .select('status')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .maybeSingle();

        setIsPendingCarrier(!!application);
      } else {
        setIsPendingCarrier(false);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const refreshRoles = async () => {
    if (user) {
      await checkRoles(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await checkRoles(session.user.id);
        } else {
          setIsAdmin(false);
          setIsCarrier(false);
          setIsPendingCarrier(false);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await checkRoles(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Écouter les changements en temps réel sur le profil de l'utilisateur
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profile-role-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.new && 'role' in payload.new) {
            const newRole = (payload.new as any).role;
            setIsAdmin(newRole === 'admin');
            setIsCarrier(newRole === 'carrier');
            if (newRole === 'carrier') {
              setIsPendingCarrier(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsCarrier(false);
    setIsPendingCarrier(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, isAdmin, isCarrier, isPendingCarrier, refreshRoles, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

