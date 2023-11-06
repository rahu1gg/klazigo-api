require("dotenv").config();
const express = require("express");
const app = express();
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const url = require("url"); // remove
const mongoose = require("mongoose");
const connectDB = require("./config/connectDB.js");
const corsOptions = require("./config/corsOptions");
const User = require("./model/User");
const port = process.env.PORT || 3500;

const REG = { SLASH: new RegExp("/", "g"), UNDERSCORE: new RegExp("_", "g") };
const homeData = require("./Data/HomeData.js");
const hospitalData = require("./Data/HospitalData.js");
const medicineCategoryData = require("./Data/MedicineCategoryData.js");
const medicineProductData = require("./Data/MedicineProductData.js");

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const JWT_AUTH_TOKEN = process.env.ACCESS_TOKEN_SECRET;
const JWT_REFRESH_TOKEN = process.env.REFRESH_TOKEN_SECRET;
const smsKey = process.env.SMS_SECRET_KEY;

const client = require("twilio")(accountSid, authToken);
let refreshTokens = [];
const { setgroups } = require("process");

connectDB();

app.use(cors(corsOptions));

app.use(express.json());

app.use(cookieParser());

// routes
app.get("/api", (req, res) => {
    res.send(homeData);
});

app.get("/hospitals", (req, res) => {
    const data = hospitalData.map((val) => ({
        id: val.id,
        hospitalName: val.hospitalName,
        distance: val.distance,
        fee: val.fee,
        stars: val.stars,
    }));
    res.send(data);
});

[
    "/multi-speciality",
    "/eye_hospitals_clinics",
    "/ears_nose_and_tongue",
    "/dental",
    "/test_center",
    "/checkup_@home",
].forEach((path) => {
    app.get(path, (req, res) => {
        const { url } = req;

        const data = hospitalData
            .filter((val) => {
                if (
                    val.type.toLowerCase() ===
                    url.replace(REG.SLASH, "").replace(REG.UNDERSCORE, " ")
                ) {
                    return val;
                }
            })
            .map((val) => ({
                id: val.id,
                hospitalName: val.hospitalName,
                distance: val.distance,
                fee: val.fee,
                stars: val.stars,
            }));

        res.send(data);
    });
});

app.get("/hospitals/:id", (req, res) => {
    const { query } = url.parse(req.url, true);
    const hid = query.hid;

    const data = hospitalData
        .filter((val) => val.id === Number(hid))
        .map((val) => ({
            id: val.id,
            hospitalName: val.hospitalName,
            info: val.info,
            viewMap: val.viewMap,
            stars: val.stars,
            fee: val.fee,
            distance: val.distance,
            code: val.code,
            categories: val.categories,
        }));
    res.send(data);
});

[
    "/multi-speciality",
    "/eye_hospitals_clinics",
    "/ears_nose_and_tongue",
    "/dental",
    "/test_center",
    "/checkup_@home",
].forEach((path) => {
    app.get(`${path}/:id`, (req, res) => {
        const { query } = url.parse(req.url, true);
        const hid = query.hid;

        const data = hospitalData
            .filter((val) => val.id === Number(hid))
            .map((val) => ({
                id: val.id,
                hospitalName: val.hospitalName,
                info: val.info,
                viewMap: val.viewMap,
                stars: val.stars,
                fee: val.fee,
                distance: val.distance,
                code: val.code,
                categories: val.categories,
            }));
        res.send(data);
    });
});

app.get("/favoriteDoctors", async (req, res) => {
    const { query } = url.parse(req.url, true);
    const phone = query.user;

    const userDetails = await User.findOne({ phone: Number(phone) }).exec();
    const { favoritesDoctors } = userDetails;

    res.send(favoritesDoctors);
});

app.get("/hospitals/:id/:doctorType", async (req, res) => {
    const { query } = url.parse(req.url, true);
    const hid = query.hid;
    const doctorType = query.dtype;
    const phone = query.user;

    const userDetails = await User.findOne({ phone: Number(phone) }).exec();
    const { favoritesDoctors } = userDetails;

    const data = hospitalData
        .filter((val) => val.id === Number(hid))
        .map((val) => ({
            id: val.id,
            hospitalName: val.hospitalName,
            info: val.info,
            viewMap: val.viewMap,
            stars: val.stars,
            fee: val.fee,
            distance: val.distance,
            code: val.code,
            doctors: val.doctors.filter(
                (val2) =>
                    val2.type.toLowerCase() ===
                    doctorType.replace(REG.UNDERSCORE, " ")
            ),
        }));

    const dataWithFavoritesDoctors = [...data, favoritesDoctors];
    console.log(dataWithFavoritesDoctors);

    res.send(dataWithFavoritesDoctors);
});

app.post("/hospitals/:id/:doctorType", async (req, res) => {
    const { setFavorite, removeFavorite, phone } = req.body;
    console.log(req.body);

    if (setFavorite) {
        await User.findOneAndUpdate(
            { phone: Number(phone.replace("+", "")) },
            {
                $addToSet: {
                    favoritesDoctors: Number(setFavorite),
                },
            }
        );
    }
    if (removeFavorite) {
        await User.findOneAndUpdate(
            { phone: Number(phone.replace("+", "")) },
            {
                $pull: {
                    favoritesDoctors: removeFavorite,
                },
            }
        );
    }
    res.sendStatus(200);
});

[
    "/multi-speciality",
    "/eye_hospitals_clinics",
    "/ears_nose_and_tongue",
    "/dental",
    "/test_center",
    "/checkup_@home",
].forEach((path) => {
    app.get(`${path}/:id/:doctorType`, (req, res) => {
        const { query } = url.parse(req.url, true);
        console.log(query);

        const hid = query.hid;
        const doctorType = query.dtype;

        const data = hospitalData
            .filter((val) => val.id === Number(hid))
            .map((val) => ({
                id: val.id,
                hospitalName: val.hospitalName,
                info: val.info,
                viewMap: val.viewMap,
                stars: val.stars,
                fee: val.fee,
                distance: val.distance,
                code: val.code,
                doctors: val.doctors.filter(
                    (val2) =>
                        val2.type.toLowerCase() ===
                        doctorType.replace(REG.UNDERSCORE, " ")
                ),
            }));

        res.send(data);
    });
});

[
    "/multi-speciality",
    "/eye_hospitals_clinics",
    "/ears_nose_and_tongue",
    "/dental",
    "/test_center",
    "/checkup_@home",
].forEach((path) => {
    app.post(`${path}/:id/:doctorType`, (req, res) => {
        console.log(req.body);
        res.sendStatus(200);
    });
});

app.get("/hospitals/:id/:doctorType/:doctorName", (req, res) => {
    const { query } = url.parse(req.url, true);
    console.log(query);

    const hid = query.hid;
    const did = query.did;
    console.log("🚀 ~ file: server.js ~ line 222 ~ app.get ~ did", did);

    const data = hospitalData
        .filter((val) => val.id === Number(hid))[0]
        .doctors.filter((val2) => val2.id === Number(did));

    res.send(data);
});

[
    "/multi-speciality",
    "/eye_hospitals_clinics",
    "/ears_nose_and_tongue",
    "/dental",
    "/test_center",
    "/checkup_@home",
].forEach((path) => {
    app.get(`${path}/:id/:doctorType/:doctorName`, (req, res) => {
        const { query } = url.parse(req.url, true);

        const hid = query.hid;
        const did = query.did;

        console.log("7");

        const data = hospitalData
            .filter((val) => val.id === Number(hid))[0]
            .doctors.filter((val2) => val2.id === Number(did));

        res.send(data);
    });
});

app.get("/medicine", (req, res) => {
    res.send(medicineCategoryData);
});

app.get("/medicine/:medType", (req, res) => {
    const { query } = url.parse(req.url, true);

    // const { medType } = req.params;
    // console.log(medType);

    console.log(query);
    const mid = query.mid;

    const { popularCategories, concernBasedCategories } = medicineCategoryData;

    const data1 = popularCategories.filter((val) => val.id === Number(mid));

    const data2 = concernBasedCategories.filter(
        (val) => val.id === Number(mid)
    );

    const data = [...data1, ...data2][0].medicines;
    res.send(data);
});

app.get("/medicine/:medType/:id", (req, res) => {
    const { query } = url.parse(req.url, true);
    const medicineId = query.medicineId;
    console.log(
        "🚀 ~ file: server.js ~ line 281 ~ app.get ~ medicineId",
        medicineId
    );

    const data = medicineProductData.filter(
        (val) => val.id === Number(medicineId)
    );

    res.send(data);
});

app.post("/medicine/:medType/:id", async (req, res) => {
    const { medicineId, phone } = req.body;
    console.log(phone, medicineId);

    await User.findOneAndUpdate(
        { phone: Number(phone.replace("+", "")) },
        {
            $addToSet: {
                cartItems: Number(medicineId),
            },
        }
    );

    res.send({ msg: "ok" });
});

app.get("/cart", (req, res) => {
    const { query } = url.parse(req.url, true);
    console.log(query);
    const phone = query.user;

    res.send({ msg: "recived phone" });
});

//
//
//

app.post("/sendOTP", (req, res) => {
    const phone = req.body.phone;
    const otp = Math.floor(100000 + Math.random() * 900000);
    const ttl = 2 * 60 * 1000;
    const expires = Date.now() + ttl;
    const data = `${phone}.${otp}.${expires}`;
    const hash = crypto.createHmac("sha256", smsKey).update(data).digest("hex");
    const fullHash = `${hash}.${expires}`;

    // client.messages
    // 	.create({
    // 		body: `Your one Time Password For CFM is ${otp}`,
    // 		from: +19706458929,
    // 		to: phone,
    // 	})
    // 	.then((message) => console.log(message))
    // 	.catch((err) => console.error(err));

    res.status(200).send({ phone, hash: fullHash, otp });
});

app.post("/verifyOTP", async (req, res) => {
    const phone = req.body.phone;
    const hash = req.body.hash;
    const otp = req.body.otp;

    if (!phone || !otp) {
        return res
            .status(400)
            .json({ message: "Username and password are required" });
    }

    let [hashValue, expires] = hash.split(".");

    let now = Date.now();

    if (now > parseInt(expires)) {
        return res.status(504).send({ msg: `Time out please try again` });
    }
    const data = `${phone}.${otp}.${expires}`;

    const newCalculatedHash = crypto
        .createHmac("sha256", smsKey)
        .update(data)
        .digest("hex");

    if (newCalculatedHash === hashValue) {
        console.log("for correct otp");

        // const duplicate = await User.findOne({ phone: phone }).exec();
        // if (duplicate) return res.sendStatus(409);

        const accessToken = jwt.sign({ data: phone }, JWT_AUTH_TOKEN, {
            expiresIn: "30s",
        });
        const refreshToken = jwt.sign({ data: phone }, JWT_REFRESH_TOKEN, {
            expiresIn: "1y",
        });
        // refreshTokens.push(refreshToken);

        try {
            const duplicate = await User.findOne({ phone: phone }).exec();

            if (!duplicate) {
                const result = await User.create({
                    phone: phone,
                });
                console.log(result);
            }

            return res
                .status(202)
                .cookie("accessToken", accessToken, {
                    expires: new Date(new Date().getTime() + 30 * 1000),
                    sameSite: "strict",
                    httpOnly: true,
                })
                .cookie("authSession", true, {
                    expires: new Date(new Date().getTime() + 30 * 1000),
                })
                .cookie("refreshToken", refreshToken, {
                    expires: new Date(new Date().getTime() + 3557600000),
                    sameSite: "strict",
                    httpOnly: true,
                })
                .cookie("refreshTokenId", true, {
                    expires: new Date(new Date().getTime() + 3557600000),
                })
                .send({ msg: `Device Verified`, phone: phone });
        } catch {
            res.status(201).json({ success: `new user ${phone} created!` });
        }
    } else {
        console.log("for incorrect otp");
        return res
            .status(200)
            .send({ verification: false, msg: `Incorrect OTP` });
    }
});

// const authenticateUser = async (req, res, next) => {
// 	const accessToken = req.cookies.accessToken;

// 	jwt.verify(accessToken, JWT_AUTH_TOKEN, async (err, phone) => {
// 		if (phone) {
// 			req.phone = phone;
// 			next();
// 		} else if (err.message === "TokenExpiredError") {
// 			return res.status(403).send({ success: false, msg: `Access Token Expired` });
// 		} else {
// 			console.error(err);
// 			res.status(403).send({ err, msg: `User not Authenticated` });
// 		}
// 	});
// };

// app.post("/api", authenticateUser, (req, res) => {
// 	console.log("home private route");
// 	res.status(202).send("Private Protected Route - Home");
// });

app.post("/refresh", (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken)
        return res
            .status(403)
            .send({ msg: `refresh token not found, Pls log in` });
    // if (!refreshTokens.includes(refreshToken))
    // 	return res.status(403).send({ msg: `Refresh Token Bocked, login Again` });

    jwt.verify(refreshToken, JWT_REFRESH_TOKEN, (err, phone) => {
        if (!err) {
            const accessToken = jwt.sign({ data: phone }, JWT_AUTH_TOKEN, {
                expiresIn: "30s",
            });

            return res
                .status(202)
                .cookie("accessToken", accessToken, {
                    expires: new Date(new Date().getTime() + 30 * 1000),
                    sameSite: "strict",
                    httpOnly: true,
                })
                .cookie("authSession", true, {
                    expires: new Date(new Date().getTime() + 30 * 1000),
                })
                .send({
                    previousSessionExpiry: true,
                    success: true,
                    phone: phone,
                });
        } else {
            return res
                .status(403)
                .send({ success: false, msg: `invalid Refresh Token` });
        }
    });
});

app.get("/logout", (req, res) => {
    res.clearCookie("refreshToken")
        .clearCookie("accessToken")
        .clearCookie("authSession")
        .clearCookie("refreshTokenId")
        .send("user logged Out");
});

app.all("*", (req, res) => {
    res.status(404).send("Page not found.");
});

mongoose.connection.once("open", () => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
        console.log(`server at http://localhost:${port}`);
    });
});
