import mongoose from "mongoose";

const connectDB = async () => {
    
    mongoose.connection.on('connected', ()=>console.log("Database Connected"));
    const conn = await mongoose.connect(`${process.env.MONGO_URI}/Segma`);
    return conn;
};

export default connectDB;