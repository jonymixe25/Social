import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { User, Post, Message } from "./types";
import Login from "./components/Login";
import Feed from "./components/Feed";
import Chat from "./components/Chat";
import CallModal from "./components/CallModal";
import { MessageCircle, Home, Users } from "lucide-react";

export const socket: Socket = io();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<"feed" | "chat">("feed");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [incomingCall, setIncomingCall] = useState<{ from: string; signal: any } | null>(null);

  useEffect(() => {
    if (user) {
      socket.emit("join", user.id);

      socket.on("incoming_call", (data) => {
        setIncomingCall(data);
      });

      return () => {
        socket.off("incoming_call");
      };
    }
  }, [user]);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="flex h-screen bg-neutral-100 text-neutral-900 font-sans">
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-white border-r border-neutral-200 flex flex-col">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-center md:justify-start">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            S
          </div>
          <span className="ml-3 font-semibold text-xl hidden md:block">SocialApp</span>
        </div>
        
        <div className="flex-1 py-4">
          <button 
            onClick={() => setActiveTab("feed")}
            className={`w-full flex items-center px-4 py-3 hover:bg-neutral-50 transition-colors ${activeTab === "feed" ? "text-indigo-600 border-r-4 border-indigo-600 bg-indigo-50/50" : "text-neutral-600"}`}
          >
            <Home className="w-6 h-6 mx-auto md:mx-0" />
            <span className="ml-4 font-medium hidden md:block">Inicio</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center px-4 py-3 hover:bg-neutral-50 transition-colors ${activeTab === "chat" ? "text-indigo-600 border-r-4 border-indigo-600 bg-indigo-50/50" : "text-neutral-600"}`}
          >
            <MessageCircle className="w-6 h-6 mx-auto md:mx-0" />
            <span className="ml-4 font-medium hidden md:block">Mensajes</span>
          </button>
        </div>

        <div className="p-4 border-t border-neutral-200 flex items-center justify-center md:justify-start">
          <div className="w-10 h-10 bg-neutral-200 rounded-full flex items-center justify-center text-neutral-600 font-bold uppercase">
            {user.username.charAt(0)}
          </div>
          <div className="ml-3 hidden md:block">
            <p className="text-sm font-medium">{user.username}</p>
            <p className="text-xs text-neutral-500">En línea</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "feed" ? (
          <Feed user={user} />
        ) : (
          <Chat 
            currentUser={user} 
            selectedUser={selectedUser} 
            setSelectedUser={setSelectedUser} 
          />
        )}
      </div>

      {/* Call Modal */}
      {incomingCall && (
        <CallModal 
          currentUser={user}
          incomingCall={incomingCall}
          onClose={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}
