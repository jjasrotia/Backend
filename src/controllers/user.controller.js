import { asyncHandler } from "../utils/asyncHandler.js"   //its a HOF that accepts function or return it
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"
const generateAccessRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        user.save({ validateBeforeSave: false }) //db save
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and access tokens")
    }
}

const registeruser = asyncHandler(async (req, res) => {
    //get user details
    //validation
    //check if user alreayd exist :usrename or email
    //file check for images, avatar
    //upload to cloudinary
    //create user object to mongo db as it accepts nosql data , creation call create entry in db
    //remove psw and refresh token field from response
    // check response for user creation
    //return res

    const { fullname, email, username, password } = req.body
    // console.log("email", email)

    // if(fullname===""){
    //     throw new ApiError(400,"Fullname is required")
    // }

    if (
        [fullname, email, username, password].some((field) => (
            field?.trim() === ""
        ))
    ) {
        throw new ApiError(400, "All fields are required")
    }
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existingUser) {
        throw new ApiError(409, "user with email or username already exists")
    }
    console.log("FILES:", req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(400, "avatar required");
    }

    let coverimageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverimageLocalPath = req.files.coverImage[0]?.path;
    }
    const user = await User.create({    //db entry 
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password  -refreshToken"    //items to remove ,these fields will not be selected
    )
    if (!createdUser) {
        throw new ApiError(500, " Something went wrong while registering user");
    }
    return res.
        status(201).json(
            new ApiResponse(200, createdUser, "user registered successfully")
        )

})

const loginUser = asyncHandler(async (req, res) => {
    //req body-data
    //username or email
    //find the user 
    //check password
    //access and refresh tpken generation and sending to user
    //send cookie
    //res success
    const { username, email, password } = req.body
    if (!(username || email)) {
        throw new ApiError(400, " username or email required")
    }
    //check if user exists
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    //error handling
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }
    //password check
    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }
    //access & refresh token 
    const { accessToken, refreshToken } = await generateAccessRefreshTokens(user._id)
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure: true     //bydef can be modfied but secure true and http modified from server only
    }
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(        //in case saving in local storage 
            new ApiResponse(200, {
                user: loggedInUser, accessToken, refreshToken
            },
                "User Logged in Successfully"
            )
        )
})


const logOutUser = asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(req.user._id,
        {
            $unset: {
                refreshToken: 1   //clear the token and a flag value passed 1 sunset the value isntead of undefined or null 
            },


        },
        {
            new: true //updated value
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))

})

//end point to refresh token

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request")

    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,

        )
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, " invalid refresh token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used")
        }
        const options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newrefreshToken } = await generateAccessRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(new ApiResponse(200,
                { accessToken, newrefreshToken: newrefreshToken },
                "access token refreshed successfully"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentUPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    // if(!(newPassword===confpassword)){


    // }
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old Pasword")
    }
    user.password = newPassword
    await user.save({ validateBeforeSave: false })
    return res
        .status(200)
        .json(new ApiResponse(200,
            {}, "Password Changed Successfully"
        ))
})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email, username } = req.body
    if (!(fullname || email)) {
        throw new ApiError(400, " All fields are required")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

//files should be updated separately 
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar not found")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar on cloudinary")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")

    return res.
        status(200)
        .json(new ApiResponse(200, user, "avatar updated"))
})

const updateuserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image not found")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image on cloudinary")
    }
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }.select("-password")
    )
    return res.status(200).
        json(new ApiResponse(200, user, "Cover iamge updated"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params    //from url use params
    if (!username?.trim()) {
        throw new ApiError(400, " user name is missing")

    }

    const channel = await User.aggregate([
        {
            $match: {    //how to match 
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {   ///mongodb saves model in lowercase therefore subscriptions  andlookup for finding items
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {    //counting total subscribers
                    $size: "$subscribers",     //use $ with fields as subscribers is a field while adding field in pipelines using addfield

                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] }, //in operator checks if user present or not in case of subscribed or not(in accpets arrays and obj)
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {   //flage on value present 1
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }

    ])     //aggregate pipeline arrays returned
    console.log("channel details", channel)

    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }
    return res.status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)   // creation  of mongoose object id as it goesdirectly in db
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [   //nested pipeline
                    {
                        $lookup:
                        {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        },

                    },
                    //structuring array now from owner result
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"   //or $arrayelementsat
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully"))
})

export {
    registeruser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentUPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateuserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}