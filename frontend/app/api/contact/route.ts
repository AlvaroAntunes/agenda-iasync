import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message, preferredContact } = body;

    // Validação básica
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Nome, email e mensagem são obrigatórios' },
        { status: 400 }
      );
    }

    // Define o texto da preferência de contato
    const contactPreference = preferredContact === 'whatsapp' ? '📱 WhatsApp' : '📧 Email';

    // Envia email usando Resend
    const { data, error } = await resend.emails.send({
      from: 'Agenda IASync <onboarding@resend.dev>',
      to: ['contatoiasync@gmail.com'],
      replyTo: email,
      subject: `Novo contato de ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0891b2;">Nova mensagem de contato</h2>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Nome:</strong> ${name}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
            ${phone ? `<p style="margin: 10px 0;"><strong>Telefone:</strong> ${phone}</p>` : ''}
            <p style="margin: 10px 0;"><strong>Preferência de Contato:</strong> ${contactPreference}</p>
          </div>
          
          <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="color: #334155; margin-top: 0;">Mensagem:</h3>
            <p style="color: #475569; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          
          <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
            Esta mensagem foi enviada através do formulário de contato do site Agenda IASync.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Erro ao enviar email:', error);
      return NextResponse.json(
        { error: 'Erro ao enviar mensagem. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Mensagem enviada com sucesso!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro no endpoint de contato:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
