'use client';

interface ConnectCalendarButtonProps {
    clinicId: string;
}

export default function ConnectCalendarButton({ clinicId }: ConnectCalendarButtonProps) {
  const handleConnect = () => {
    // Redireciona o navegador para o seu Backend
    window.location.href = `http://localhost:8000/auth/login?clinic_id=${clinicId}`;
  };

  return (
    <button 
      onClick={handleConnect}
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    >
      Conectar Google Calendar
    </button>
  );
}