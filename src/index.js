import dotenv from "dotenv"
// import mongoose from "mongoose";
// import {DB_NAME} from "./constants";
import connectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

connectDB().then(
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server is running at PORT:${process.env.PORT}`)
    })
)
.catch((err)=>{
    console.log("Mongo Db Connection failed !!!", err)
})




















// import express from "express"
// const app=express()
// //iifes

// (async()=>{
//     try {
//        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//        app.on("error",(error)=>{
//         console.log("Error:",error)
//         throw error
//        })
//        app.listen(process.env.PORT,()=>{
//         console.log(`App listening on port $ {process.env.PORT}`)
//        })
//     } catch (error) {
//         console.log("Error:", error);
//         throw err
        
//     }

// })