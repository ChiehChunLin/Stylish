const express = require("express");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const app = express();
const adminRoute = require("./routes/admin-route");
const userRoute = require("./routes/user-route");
const marketRoute = require("./routes/marketing-route");
const productsRoute = require("./routes/products-route");
const orderRoute = require("./routes/order-route");
const midtermRoute = require("./routes/midterm-route");
const { getPayData } = require("./db/order-model");
const { rpushRedis } = require("./db/redis-cache");
const {
  authJwtCheckNext,
  authJwtCheckLogin,
  authAdminCheck,
} = require("./middleware/authenticate");
const {
  cacheCampaign,
  cacheUserAndShoppingRecord,
} = require("./middleware/checkCache");
const { rateProtector } = require("./middleware/rateLimiter");

const cors = require("cors");
const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;
const morganBody = require("morgan-body");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("connect-flash");
const dotenv = require("dotenv");
dotenv.config();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false, // false to store anything before user logs in.
    cookie: {
      httpOnly: true,
      sameSite: "none",
      // secure: true, //secure makes flash doesn't work
      // maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
const logStream = fs.createWriteStream(path.join(__dirname, "access.log"), {
  flags: "a",
});
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});
const logger = createLogger({
  level: "info",
  format: combine(timestamp(), logFormat),
  transports: [
    new transports.Console(),
    new transports.File({ filename: "console.log" }),
  ],
});
console.log = function (...args) {
  const message = args
    .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
    .join(" ");
  logger.info(message);
};
morganBody(app, {
  noColors: true,
  stream: logStream,
});
app.use(flash());
app.use("/", rateProtector);
app.use(
  `/api/${process.env.API_VERSION}/user`,
  authJwtCheckNext,
  cacheUserAndShoppingRecord,
  userRoute
);
app.use(
  `/api/${process.env.API_VERSION}/order`,
  authJwtCheckLogin,
  cacheUserAndShoppingRecord,
  orderRoute
);
app.use(
  `/api/${process.env.API_VERSION}/marketing`,
  cacheCampaign,
  marketRoute
);
app.use(
  `/api/${process.env.API_VERSION}/products`,
  cacheCampaign,
  authJwtCheckNext,
  cacheUserAndShoppingRecord,
  productsRoute
);
app.use(
  `/api/${process.env.API_VERSION}/admin`,
  authJwtCheckNext,
  cacheUserAndShoppingRecord,
  authAdminCheck,
  adminRoute
);
app.use(
  `/api/${process.env.API_VERSION}/mid`,
  authJwtCheckNext,
  cacheUserAndShoppingRecord,
  midtermRoute
);
app.use(
  "/admin",
  authJwtCheckLogin,
  cacheUserAndShoppingRecord,
  authAdminCheck,
  express.static("admin")
);
app.use("/public", express.static("public"));

//---------------------------------
//------      Routes --------------
//---------------------------------

app.get("/", async (req, res) => {
  res.redirect(`/api/${process.env.API_VERSION}/products/all`);
});

const redisList = "paylist";
app.get("/api/1.0/report/payments", async (req, res) => {
  try {
    const data = await getPayData();
    const userTotal = [];
    data.forEach((d) => {
      let user = userTotal.find((x) => x.user_id === d.user_id);
      if (user == undefined) {
        const newer = {};
        newer.user_id = d.user_id;
        newer.total_payment = d.total;
        userTotal.push(newer);
      } else {
        user.total_payment += d.total;
      }
    });
    res.status(200).send({ userTotal });
  } catch (err) {
    console.log("report payment error: " + err);
    res.status(500).send(err);
  }
});
app.get("/api/2.0/report/payments", async (req, res) => {
  try {
    const data = await getPayData();
    await rpushRedis(redisList, data);
    res.status(200).send("Data calculating...");
  } catch (err) {
    console.log("report payment error: " + err);
    res.status(500).send(err);
  }
});

// app.use((req, res, next) => {
//   const err = new Error(`Not Found!`);
//   err.status = 404;
//   next(err);
// });

app.use((err, req, res, next) => {
  console.log(err);
  res.locals.error = err;
  const status = err.status || 500;
  res.status(status).send({ message: `Oops!! ${err}` });
});

// const sslServer = https.createServer(sslOptions, app);
// sslServer.listen(443, () => console.log("Secured connection established!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
