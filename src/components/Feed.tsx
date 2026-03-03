import { useState, useEffect } from "react";
import { User, Post } from "../types";
import { socket } from "../App";
import CreatePost from "./CreatePost";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface FeedProps {
  user: User;
}

export default function Feed({ user }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => {
        setPosts(data);
        setLoading(false);
      });

    const handleNewPost = (post: Post) => {
      setPosts((prev) => [post, ...prev]);
    };

    socket.on("new_post", handleNewPost);

    return () => {
      socket.off("new_post", handleNewPost);
    };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-neutral-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <CreatePost user={user} />
        
        {loading ? (
          <div className="text-center py-10 text-neutral-500">Cargando publicaciones...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 text-neutral-500 bg-white rounded-2xl border border-neutral-200">
            No hay publicaciones aún. ¡Sé el primero en compartir algo!
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl p-5 shadow-sm border border-neutral-200">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold uppercase">
                    {post.username.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-neutral-900">{post.username}</p>
                    <p className="text-xs text-neutral-500">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                </div>
                
                {post.content && (
                  <p className="text-neutral-800 mb-4 whitespace-pre-wrap">{post.content}</p>
                )}
                
                {post.media_url && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-neutral-100 bg-neutral-50">
                    {post.media_type === "image" ? (
                      <img src={post.media_url} alt="Post media" className="w-full max-h-96 object-contain" />
                    ) : (
                      <video src={post.media_url} controls className="w-full max-h-96" />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
