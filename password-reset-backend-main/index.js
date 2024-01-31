
const express = require("express");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const dotenv = require("dotenv").config();
const cors = require("cors");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
// const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

app.use(cors({
    origin: "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
}));

app.set("view engine", "ejs");
app.set("views", "E:/AN folder/Node JS folder/Password BE");

app.use(express.urlencoded({ extended: false }));

const URL =process.env.mongodb_url;

function authorize(req, res, next) {
    if (req.headers.authorization) {
        try {

            const verify = jwt.verify((req.headers.authorization), process.env.secret_key);
            if (verify) {
                next();
            } else {
                res.status(401).json({ message: "Unauthorized" });
            }
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Something went wrong !" })
        }

    } else {
        res.status(401).json({ message: "Unauthorized" });
    }

}

async function createForgetPasswordToken() {

    // const resetToken = await bcrypt.genSalt(10);
    // const tokenExpireIn = Date.now() + 10 * 60 * 1000;

    // console.log(resetToken + " " + "token Expiry" + " " + tokenExpireIn);
    // return { resetToken, tokenExpireIn };
    const resetToken = await bcrypt.genSalt(10);
    const hashToken = await bcrypt.hash(resetToken, resetToken);
    const token = hashToken;
    const tokenExpireIn = Date.now() + 10 * 60 * 1000;

    console.log(resetToken + " " + "hashed token" + " " + token + " " + "token ExperireIn" + " " + tokenExpireIn);
    return { resetToken, token, tokenExpireIn };
}

// const sendEmail = async (option) => {
//     try {

//         const transporter = nodemailer.createTransport({
//             host: process.env.Email_Host,
//             post: process.env.Email_Port,
//             auth: {
//                 user: process.env.Email_User,
//                 pass: process.env.Email_Password
//             }
//         })

//         const emailOptions = {
//             from: "Cineflix support <support@cineflix.com>",
//             to: option.email,
//             subject: option.subject,
//             text: option.message
//         }

//         await transporter.sendMail(emailOptions);
//         // resolve();
//     } catch (error) {
//         console.error("Error sending email:", error);
//         // reject(error);
//     }
// }


const sendEmail = async (option) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.Email_Host,
            port: process.env.Email_Port,
            auth: {
                user: process.env.Email_User,
                pass: process.env.Email_Password
            }
        });
        
        const emailOptions = {
            from: "NARMADHA ALLIMUTHU<narmadhallimuthu006@gmail.com>",
            to: option.email,
            subject: option.subject,
            text: option.message
        };

        await transporter.sendMail(emailOptions);
        console.log("Email sent successfully!");
    } catch (error) {
        console.error("Error sending email:", error);
    }
};




app.get("/", (req, res) => {
    res.send("API created successfully !!");
});


app.post("/register", async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(req.body.password, salt);
        // console.log(hashPassword);
        const connection = await MongoClient.connect(URL);
        const db = connection.db("password_reset_flow");
        const checkUser = await db.collection("register_creating_user").find({ userFirstName: req.body.userFirstName }).toArray();
        const checkUser2 = await db.collection("register_creating_user").find({ userFirstName: req.body.userLastName }).toArray();

        if (checkUser.length > 0 || checkUser2.length > 0) {
            res.status(401).json({ message: "User already exists. Change data to register." });
        }

        else {
            req.body.password = hashPassword
            req.body.confirmPassword = hashPassword
            const user = await db.collection("register_creating_user").insertOne(req.body);
            //    console.log(req.body);
            res.json({ meassage: "Registered Successfully !" })
            await connection.close();

        }
    } catch (error) {
        console.log("Error", error);
        res.json({ message: "Something went wrong" });
    }

});


app.get("/register", async (req, res) => {
    try {

        const connection = await MongoClient.connect(URL);
        const db = connection.db("password_reset_flow");
        const userRegistered = await db.collection("register_creating_user").find().toArray();
        await connection.close();
        res.json(userRegistered)

    } catch (error) {
        console.log("Error", error);
        res.json({ message: "Something went wrong" });
    }

});

app.post("/login", async (req, res) => {
    try {
        const connection = await MongoClient.connect(URL);
        const db = connection.db("password_reset_flow");

        const user = await db.collection("register_creating_user").findOne({ emailId: req.body.emailId.toLowerCase() });
        // console.log("User Data from Database:", user);
        if (user) {
            const passwordCheck = await bcrypt.compare(req.body.password, user.password);

            if (passwordCheck) {
                const token = jwt.sign({ email: user.emailId }, process.env.secret_key);
                res.json({ message: "Login Successfully", token });
            } else {
                res.status(401).json({ message: "Invalid Password" });
            }
        } else {
            res.status(404).json({ message: "User not found" });
        }

        await connection.close();
    } catch (error) {
        console.log("Error", error);
        res.status(500).json({ message: "Something went wrong" });
    }
});


app.post("/forget-password", async (req, res) => {
    try {
        console.log("Received request with data:", req.body);
        const connection = await MongoClient.connect(URL);
        const db = connection.db("password_reset_flow");

        const user = await db.collection("register_creating_user").findOne({ emailId: req.body.emailId.toLowerCase() });
        if (!user) {
            res.status(404).json({ message: " User Not Found ! " })
        } else {
            const resetPasswordToken = await createForgetPasswordToken();
            // const userUpdate = await db.collection("register_creating_user").UpdateOne(user,{token,tokenExpireIn});
            const userUpdate = await db.collection("register_creating_user").updateOne({ _id: user._id }, { $set: { token: resetPasswordToken.token, tokenExpireIn: resetPasswordToken.tokenExpireIn } });
            // res.json({ message: "Password reset token created successfully!" });

            // const resetPasswordToken = await createForgetPasswordToken();
            // const userUpdate = await db.collection("register_creating_user").updateOne(
            //     { _id: user._id },
            //     { $set: { token: resetPasswordToken.resetToken, tokenExpireIn: resetPasswordToken.tokenExpireIn } }
            // );

            const resetUrl = `${req.protocol}://${req.get("host")}/reset-password/${resetPasswordToken.token}`;
            // const resetUrl = `${req.protocol}://${req.get("host")}/reset-password/${encodeURIComponent(resetPasswordToken.token)}`;

            const message = `We have recieved a Password reset request. Please use the below link to reset the password
\n\n ${resetUrl}\n\n This reset password link will be valid for only 10 mintues .`

            try {
                await sendEmail({
                    email: user.emailId,
                    subject: "Password change request recieved ! ",
                    message: message
                });
                res.status(200).json({
                    status: "Success",
                    message: "Password reset link sended to the user mail "
                })
            } catch (error) {
                console.error("Error sending email:", error);
                res.status(500).json({ message: "There was an error in sending reset password email. Please try again later !" })
            }

        }
    } catch (error) {
        console.log(" Error ", error)
        res.status(500).json({ message: "Something went wrong !" })
    }

});


app.get("/reset-password/:token", async (req, res) => {
    try {
        const resetToken = req.params.token;
        // const salt = await bcrypt.genSalt(10);
        // const hashToken = await bcrypt.hash(resetToken, salt);

        const connection = await MongoClient.connect(URL);
        const db = connection.db("password_reset_flow");
        const user = await db.collection("register_creating_user").findOne({ token: resetToken});

        if (!user) {

            res.send("User Not Found !");
        } else {
            res.render("index.ejs", { token: req.params.token });
        }

    } catch (error) {

        console.log("Error", error),
            res.status(500).json({ message: "Something went wrong !" });
    }

});




// app.get("/reset-password/:token",async(req,res)=>{
//     res.sendFile("E:\AN folder\Node JS folder\Password FE\password-reset-flow\src" + "/ResetPasswordPage.jsx");
// })

app.put("/reset-password/:token", async (req, res) => {

    try {
        // const salt = await bcrypt.genSalt(10);
        const hashToken = await bcrypt.hash(req.params.token, 10);
        const connection = await MongoClient.connect(URL);
        const db = connection.db("password_reset_flow");
        const findUser =await db.collection("register_creating_user").findOne({
            token: hashToken,
            tokenExpireIn: { $gt: Date.now() }
        });
        console.log(findUser);
        if (!findUser) {
            res.status(400).send("Token is invalid or expired !")
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);

            const updatePassword = db.collection("register_creating_user").updateOne(
                { _id: findUser._id },
                {
                     $set: {
                         password: hashedPassword, 
                         confirmPassword:hashedPassword, 
                         passwordChangedAt: Date.now() } });

            const token = jwt.sign({ email: findUser.emailId }, process.env.secret_key);
            res.json({ message: "Password reseted and Login Successfully !", token });
        }

    } catch (error) {
        console.log(" Error ", error)
        res.status(500).json({ message: "Something went wrong !" })
    }

})


app.post("/create-user", authorize, async (req, res) => {

    try {

        const connection = await MongoClient.connect(URL);
        const db = connection.db("password_reset_flow");
        const userRegistered = await db.collection("create_user").insertOne(req.body);
        await connection.close();
        res.json({ message: " Created User sucessfully !" })

    } catch (error) {
        console.log("Error", error);
        res.json({ message: "Something went wrong" });
    }


})

app.get("/userlist", authorize, async (req, res) => {
    try {

        const connection = await MongoClient.connect(URL);
        const db = connection.db("password_reset_flow");
        const userRegistered = await db.collection("create_user").find().toArray();
        await connection.close();
        res.json(userRegistered)

    } catch (error) {
        console.log("Error", error);
        res.json({ message: "Something went wrong" });
    }

})


app.listen(3005);























// app.post("/login", async (req, res) => {
//     try {
//         const salt = await bcrypt.genSalt(10);
//         const hashPassword = await bcrypt.hash(req.body.password, salt);

//         const connection = await MongoClient.connect(URL);
//         const db = connection.db("password_reset_flow");
//         const user = await db.collection("register_creating_user").findOne({ emailId: req.body.emailId });

//         if (user) {
//             const passwordCheck = await bcrypt.compare(req.body.password, user.password);
//             if (passwordCheck) {
//                 const token = jwt.sign({ email: user.emailId }, process.env.secret_key);
//                 res.json({ message: "Login Successfully", token });

//             } else {
//                 res.status(401).json({ message: "Enter Valid User mail or Password" });
//             }
//         } else {
//             res.status(404).json({ message: "Enter Valid User mail or Password" });
//         }

//         // res.json({meassage : "Logined Successfully !"})
//         await connection.close();
//     } catch (error) {
//         console.log("Error", error);
//         res.json({ message: "Something went wrong" });
//     }
// });

