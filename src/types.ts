export interface User {
  id: string;
  username: string;
  avatar: string | null;
}

export interface Post {
  id: string;
  user_id: string;
  username: string;
  avatar: string | null;
  content: string;
  media_url: string | null;
  media_type: "image" | "video" | null;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}
