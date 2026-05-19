import { Router } from "express";
import {
    changeCurrentUPassword,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser,
    logOutUser,
    refreshAccessToken,
    registeruser,
    updateAccountDetails,
    updateUserAvatar,
    updateuserCoverImage
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([     //middleware injected upload 
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registeruser)
// router.post("/register", registeruser);
router.route("/login").post(
    loginUser
)
//secured routes

router.route("/logout").post(verifyJwt, logOutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJwt, changeCurrentUPassword)
router.route("/current-user").get(verifyJwt, getCurrentUser)
router.route("/update-account-details").patch(verifyJwt, updateAccountDetails)
router.route("/avatar").patch(verifyJwt, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJwt, upload.single("/coverImage"), updateuserCoverImage)
router.route("/c/:username").get(verifyJwt, getUserChannelProfile)  //for params
router.route("/history").get(verifyJwt, getWatchHistory)

export default router
