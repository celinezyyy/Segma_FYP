import express from "express";
import cors from "cors";
import 'dotenv/config';
import { createServer } from "http";     
import { Server } from "socket.io";  
import cookieParser from "cookie-parser";
import connectDB from "./config/mongodb.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import datasetRouter from "./routes/datasetRoutes.js";
import segmentationRouter from "./routes/segmentationRoutes.js";
import reportRouter from "./routes/reportRoutes.js";
import { initGridFS } from "./utils/gridfs.js";

// npm run server

const app  = express();
const port = process.env.PORT || 5000;

// Create HTTP server (so we can attach Socket.IO)
const server = createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible inside routes/controllers
app.set('io', io);

// Optional: Handle client connection
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Optional — you can associate the socket with user later if needed
  // Allow the client to register its userId so the server can emit to that user's room
  socket.on('register', (payload) => {
    try {
      const userId = (payload && payload.userId) ? payload.userId : payload;
      if (userId) {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined room for user ${userId}`);
      }
    } catch (e) {
      console.warn('Error during socket register:', e);
    }
  });
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
];
// Increase JSON body size limit to accept dashboard images (base64)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(cookieParser());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Connect DB and Init GridFS
connectDB().then(async (conn) => {
  await initGridFS(conn.connection); // Initialize GridFS with Mongoose connection
  console.log("GridFS initialized");

  server.listen(port, () => console.log(`Server started on PORT: ${port}`));
});

// API Endpoints
app.get('/', (req,res)=> res.send("API working."));
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/dataset', datasetRouter);
app.use('/api/segmentation', segmentationRouter);
app.use('/api/reports', reportRouter);