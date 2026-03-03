import { useState } from "react";
import { User } from "../types";
import { LogIn } from "lucide-react";

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      }
    } catch (error) {
      console.error("Login error", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl">
            S
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-neutral-900 mb-2">Bienvenido a SocialApp</h1>
        <p className="text-center text-neutral-500 mb-8">Ingresa tu nombre de usuario para continuar</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-1">
              Nombre de usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Ej. juanperez"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors flex items-center justify-center"
          >
            {loading ? "Entrando..." : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Entrar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
