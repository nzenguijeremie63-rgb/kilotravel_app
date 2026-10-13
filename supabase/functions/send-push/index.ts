import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webPush from "npm:web-push";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

webPush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") || "mailto:kilotravel@gmail.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, table, record, old_record } = payload;
    let targetUserIds: string[] = [];
    let notificationPayload = { title: "Nouvelle notification", body: "" };

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (table === "reservations") {
      // 1. Un utilisateur qui avait réservé un colis doit être informé que son colis a changé de statut
      if (type === "UPDATE" && record.status !== old_record.status) {
        targetUserIds = [record.user_id]; 
        notificationPayload = {
          title: "Mise à jour de votre réservation",
          body: `Le statut de votre réservation est maintenant : ${record.status}`,
        };
      }
      
      // 2. Notification pour les admins lors d'une nouvelle réservation
      if (type === "INSERT") {
        const { data: admins } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("role", "admin");
          
        if (admins) {
          targetUserIds = admins.map(a => a.id);
        }
        
        notificationPayload = {
          title: "Nouvelle réservation de colis",
          body: "Un nouveau colis a été réservé sur la plateforme.",
        };
      }
    } else if (table === "carrier_applications") {
      // 1. Notification pour l'admin lors d'une nouvelle demande de transporteur
      if (type === "INSERT") {
        const { data: admins } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("role", "admin");
          
        if (admins) {
          targetUserIds = admins.map(a => a.id);
        }
        
        notificationPayload = {
          title: "Nouvelle candidature de transporteur",
          body: "Un nouveau transporteur vient de s'inscrire et attend d'être validé.",
        };
      } else if (type === "UPDATE" && record.status === "approved" && old_record?.status !== "approved") {
        // 2. Notification pour le transporteur validé
        targetUserIds = [record.user_id];
        notificationPayload = {
          title: "Compte transporteur validé 🎉",
          body: "Félicitations ! Votre profil transporteur a été approuvé. Vous pouvez désormais publier vos offres de kilos !",
        };

        // Envoi automatique d'email via Resend si configuré
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (record.email && resendApiKey) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: Deno.env.get("RESEND_FROM_EMAIL") || "Kilotravel <notifications@kilotravel.com>",
                to: [record.email],
                subject: "Votre compte transporteur / vendeur Kilotravel est APPROUVÉ ! 🎉",
                text: `Bonjour ${record.full_name} !\n\nFélicitations, votre dossier a été vérifié et votre compte transporteur / vendeur Kilotravel est désormais APPROUVÉ !\n\nVous pouvez dès à présent vous connecter et publier vos premières offres de transport de kilos\n\nBienvenue dans le réseau Kilotravel !`,
              }),
            });
          } catch (mailErr) {
            console.error("Error sending approval email via Resend:", mailErr);
          }
        }
      } else if (type === "UPDATE" && record.status === "rejected" && old_record?.status !== "rejected") {
        // 3. Notification en cas de refus
        targetUserIds = [record.user_id];
        notificationPayload = {
          title: "Demande de transporteur",
          body: "Votre demande de statut transporteur n'a pas été retenue.",
        };
      }
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ message: "No targets" }), { status: 200 });
    }

    // Récupérer les abonnements push
    const { data: subscriptions, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No subscriptions found" }), { status: 200 });
    }

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webPush.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        );
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      }
    });

    await Promise.all(sendPromises);

    return new Response(JSON.stringify({ message: "Notifications sent" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
