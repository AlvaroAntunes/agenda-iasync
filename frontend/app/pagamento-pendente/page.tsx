"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { logger } from "@/lib/logger";

export default function PagamentoPendente() {
  const router = useRouter()
  const [loading, setLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    // Busca o link assim que a página carrega
    const fetchPaymentLink = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Pega o Clinic ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('clinic_id')
          .eq('id', user.id)
          .single();

        if (profile?.clinic_id) {
          // 2. Chama seu Backend
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/checkout/pending/${profile.clinic_id}`);
          const data = await res.json();
          
          if (data.url) {
            setPaymentUrl(data.url);
          }
        }
      } catch (error) {
        logger.error("Erro ao buscar fatura:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentLink();
  }, []);

  const handleRegularizar = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
    } else {
      // Fallback se não achou link específico
      window.open("https://www.asaas.com/customerPortal", '_blank');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acesso Suspenso
        </h1>
        
        <p className="text-gray-600 mb-8">
          Identificamos uma pendência na sua assinatura. Para continuar usando a plataforma, por favor regularize o pagamento.
        </p>

        <div className="space-y-3">
          <button 
            onClick={handleRegularizar}
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando Fatura...
              </>
            ) : (
              "Pagar Fatura em Aberto"
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </motion.div>
    </div>
  );
}