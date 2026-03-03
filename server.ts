import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import Database from "better-sqlite3";

const PORT = 3000;

// Setup Database
const db = new Database("social.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    avatar TEXT
  );
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  );
`);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // --- API Routes ---

  // Auth: Simple login/register
  app.post("/api/auth", (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    let user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    if (!user) {
      const id = uuidv4();
      db.prepare("INSERT INTO users (id, username) VALUES (?, ?)").run(id, username);
      user = { id, username, avatar: null };
    }
    res.json(user);
  });

  // Users
  app.get("/api/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  // Posts
  app.get("/api/posts", (req, res) => {
    const posts = db.prepare(`
      SELECT posts.*, users.username, users.avatar 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      ORDER BY posts.created_at DESC
    `).all();
    res.json(posts);
  });

  app.post("/api/posts", upload.single("media"), (req, res) => {
    const { user_id, content } = req.body;
    const file = req.file;
    const id = uuidv4();
    
    let media_url = null;
    let media_type = null;

    if (file) {
      media_url = `/uploads/${file.filename}`;
      media_type = file.mimetype.startsWith("video/") ? "video" : "image";
    }

    db.prepare(`
      INSERT INTO posts (id, user_id, content, media_url, media_type) 
      VALUES (?, ?, ?, ?, ?)
    `).run(id, user_id, content || "", media_url, media_type);

    const post = db.prepare(`
      SELECT posts.*, users.username, users.avatar 
      FROM posts 
      JOIN users ON posts.user_id = users.id 
      WHERE posts.id = ?
    `).get(id);

    io.emit("new_post", post);
    res.json(post);
  });

  // Messages
  app.get("/api/messages/:userId/:otherUserId", (req, res) => {
    const { userId, otherUserId } = req.params;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) 
         OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `).all(userId, otherUserId, otherUserId, userId);
    res.json(messages);
  });

  // --- Socket.io ---
  const userSockets = new Map<string, string>(); // userId -> socketId

  io.on("connection", (socket) => {
    socket.on("join", (userId: string) => {
      userSockets.set(userId, socket.id);
      socket.join(userId); // Join a room with their own user ID
      io.emit("user_status", { userId, status: "online" });
    });

    socket.on("send_message", (data: { sender_id: string; receiver_id: string; content: string }) => {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO messages (id, sender_id, receiver_id, content) 
        VALUES (?, ?, ?, ?)
      `).run(id, data.sender_id, data.receiver_id, data.content);

      const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(id);
      
      // Send to receiver
      io.to(data.receiver_id).emit("receive_message", message);
      // Send back to sender for confirmation
      socket.emit("receive_message", message);
    });

    // WebRTC Signaling
    socket.on("call_user", (data: { userToCall: string; signalData: any; from: string }) => {
      io.to(data.userToCall).emit("incoming_call", { signal: data.signalData, from: data.from });
    });

    socket.on("answer_call", (data: { to: string; signal: any }) => {
      io.to(data.to).emit("call_accepted", data.signal);
    });

    socket.on("end_call", (data: { to: string }) => {
      io.to(data.to).emit("call_ended");
    });

    socket.on("disconnect", () => {
      let disconnectedUserId = null;
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          userSockets.delete(userId);
          break;
        }
      }
      if (disconnectedUserId) {
        io.emit("user_status", { userId: disconnectedUserId, status: "offline" });
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
