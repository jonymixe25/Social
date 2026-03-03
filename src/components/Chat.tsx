import React, { useState, useEffect, useRef } from "react";
import { User, Message } from "../types";
import { socket } from "../App";
import { Send, Phone, Video, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ChatProps {
  currentUser: User;
  selectedUser: User | null;
  setSelectedUser: (user: User | null) => void;
}

export default function Chat({ currentUser, selectedUser, setSelectedUser }: ChatProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.filter((u: User) => u.id !== currentUser.id)));
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedUser) {
      fetch(`/api/messages/${currentUser.id}/${selectedUser.id}`)
        .then((res) => res.json())
        .then((data) => setMessages(data));
    }
  }, [selectedUser, currentUser.id]);

  useEffect(() => {
    const handleReceiveMessage = (message: Message) => {
      if (
        (message.sender_id === currentUser.id && message.receiver_id === selectedUser?.id) ||
        (message.sender_id === selectedUser?.id && message.receiver_id === currentUser.id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [currentUser.id, selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    socket.emit("send_message", {
      sender_id: currentUser.id,
      receiver_id: selectedUser.id,
      content: newMessage.trim(),
    });

    setNewMessage("");
  };

  const startCall = (video: boolean) => {
    if (!selectedUser) return;
    // Emit call event
    // The actual WebRTC logic will be handled in CallModal
    // For now, we just open the modal on our side and send a signal
    window.dispatchEvent(new CustomEvent("start_call", { 
      detail: { userToCall: selectedUser, video } 
    }));
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white">
      {/* Users List */}
      <div className={`w-full md:w-80 border-r border-neutral-200 flex flex-col ${selectedUser ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-neutral-200 bg-neutral-50">
          <h2 className="font-bold text-lg text-neutral-900">Mensajes</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {users.length === 0 ? (
            <div className="p-4 text-center text-neutral-500">No hay otros usuarios registrados.</div>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className={`w-full flex items-center p-4 border-b border-neutral-100 hover:bg-neutral-50 transition-colors ${selectedUser?.id === u.id ? "bg-indigo-50/50" : ""}`}
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold uppercase flex-shrink-0">
                  {u.username.charAt(0)}
                </div>
                <div className="ml-4 text-left flex-1">
                  <p className="font-semibold text-neutral-900">{u.username}</p>
                  <p className="text-xs text-neutral-500 truncate">Toca para chatear</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedUser ? "hidden md:flex" : "flex"}`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-neutral-200 bg-white flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="mr-3 md:hidden p-2 text-neutral-500 hover:bg-neutral-100 rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold uppercase">
                  {selectedUser.username.charAt(0)}
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-neutral-900">{selectedUser.username}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => startCall(false)}
                  className="p-2 text-neutral-500 hover:bg-neutral-100 hover:text-indigo-600 rounded-full transition-colors"
                  title="Llamada de audio"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => startCall(true)}
                  className="p-2 text-neutral-500 hover:bg-neutral-100 hover:text-indigo-600 rounded-full transition-colors"
                  title="Videollamada"
                >
                  <Video className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-neutral-50 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMe ? "bg-indigo-600 text-white rounded-br-none" : "bg-white border border-neutral-200 text-neutral-900 rounded-bl-none shadow-sm"}`}>
                      <p className="break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? "text-indigo-200" : "text-neutral-400"}`}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-neutral-200">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-neutral-100 border-transparent rounded-full px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-neutral-50 text-neutral-400">
            <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
              <Send className="w-10 h-10 text-neutral-300" />
            </div>
            <p className="text-lg font-medium text-neutral-500">Selecciona un chat para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
}
