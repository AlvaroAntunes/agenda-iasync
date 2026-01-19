import { AsaasClient } from '@/lib/asaas-client'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const paymentId = searchParams.get('paymentId')

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID não fornecido' },
        { status: 400 }
      )
    }

    const asaas = new AsaasClient()
    const payment = await asaas.getPayment(paymentId)

    return NextResponse.json(payment)
  } catch (error: any) {
    console.error('Erro ao buscar status:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar status' },
      { status: 500 }
    )
  }
}
