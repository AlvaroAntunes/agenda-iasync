// Script para testar webhook localmente
// Execute: node scripts/test-webhook.js ou cole no console do navegador

const testWebhook = async () => {
  console.log('🧪 Testando webhook de pagamento...')
  
  // Simulando pagamento recebido
  const webhookPayload = {
    event: 'PAYMENT_RECEIVED',
    payment: {
      id: 'pay_test_' + Date.now(), // ID único para teste
      customer: 'cus_test123',
      value: 297.00,
      netValue: 297.00,
      dueDate: '2026-01-26',
      billingType: 'PIX',
      status: 'RECEIVED',
    }
  }

  console.log('📤 Enviando webhook:', webhookPayload)

  try {
    const response = await fetch('http://localhost:3000/api/webhooks/asaas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    })

    const data = await response.json()
    console.log('✅ Resposta do webhook:', data)
    
    if (response.ok) {
      console.log('🎉 Webhook processado com sucesso!')
    } else {
      console.error('❌ Erro ao processar webhook:', data)
    }
  } catch (error) {
    console.error('💥 Erro na requisição:', error)
  }
}

// Para executar no Node.js
if (typeof window === 'undefined') {
  testWebhook()
}

// Para executar no console do navegador
if (typeof window !== 'undefined') {
  console.log('Execute: testWebhook()')
}

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined') {
  module.exports = { testWebhook }
}
