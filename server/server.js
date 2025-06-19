import express from "express";
import cors from "cors";
import 'dotenv/config';
import cookieParser from "cookie-parser";
import connectDB from "./config/mongodb.js";
import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import datasetRouter from "./routes/datasetRoutes.js";
import { initGridFS } from "./utils/gridfs.js";
// import segmentRouter from "./routes/segmentationRoutes.js";

// npm run server

const app  = express();
const port = process.env.PORT;
// connectDB();

const allowedOrigins = 'http://localhost:5173'
app.use(express.json());
app.use(cookieParser());
app.use(cors({origin: allowedOrigins, credentials: true}));

// Connect DB and Init GridFS
connectDB().then((conn) => {
  initGridFS(conn.connection); // Initialize GridFS with Mongoose connection
  console.log("GridFS initialized");
});

// API Endpoints
app.get('/', (req,res)=> res.send("API working."));
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/dataset', datasetRouter);
// app.use('/api/segment', segmentRouter);

app.listen(port, () => console.log(`Server started on PORT: ${port}`));