import multer from "multer";

//using disk storage  m/m strage can be used but m/mstorage issue due to heavy files or videos 
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

export const upload = multer({ storage })