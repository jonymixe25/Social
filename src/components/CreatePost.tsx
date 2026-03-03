import React, { useState, useRef } from "react";
import { User } from "../types";
import { Image as ImageIcon, Video, Send, X } from "lucide-react";

interface CreatePostProps {
  user: User;
}

export default function CreatePost({ user }: CreatePostProps) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("user_id", user.id);
    formData.append("content", content);
    if (file) {
      formData.append("media", file);
    }

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setContent("");
        clearFile();
      }
    } catch (error) {
      console.error("Error creating post", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-200">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex-shrink-0 flex items-center justify-center text-indigo-600 font-bold uppercase">
            {user.username.charAt(0)}
          </div>
          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="¿Qué estás pensando?"
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none min-h-[100px]"
            />
            
            {preview && (
              <div className="relative mt-3 inline-block">
                {file?.type.startsWith("video/") ? (
                  <video src={preview} className="max-h-48 rounded-lg border border-neutral-200" controls />
                ) : (
                  <img src={preview} alt="Preview" className="max-h-48 rounded-lg border border-neutral-200 object-cover" />
                )}
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-100">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <ImageIcon className="w-5 h-5 mr-2 text-emerald-500" />
                  Foto
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <Video className="w-5 h-5 mr-2 text-blue-500" />
                  Video
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading || (!content.trim() && !file)}
                className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-medium hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors flex items-center"
              >
                {loading ? (
                  "Publicando..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publicar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
