const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();
const { newUser } = require("./db/user-model");
const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

Promise.all([
  newUser(
    "native",
    "admin",
    "aaa123456",
    "aaa123456@fakemail.com",
    "$2b$10$tzcVE8bVVv6k151knLPC1.xuA5GbFpuRtDO3ekKhDsiu85td5i6by"
  ),
  newUser(
    "native",
    "user",
    "bbb123456",
    "bbb123456@fakemail.com",
    "$2b$10$Sd3DjzL/atGLfPcdCzq0AOH8uPRdRq8jzxBfXR.mVyQjWme8Jv11u"
  ),
  newUser(
    "native",
    "user",
    "ccc123456",
    "ccc123456@fakemail.com",
    "$2b$10$OFCQ.3eScwr7BFcLpW8Icu5M4c8gtP1Oin6GE/MQBCs4k2SSl47i2"
  ),
  newUser(
    "native",
    "user",
    "ddd123456",
    "ddd123456@fakemail.com",
    "$2b$10$uJgpM3eGeRNYjfI9pTPxouxYrvV5kf8l6x4W8T2qW99bHU0HWnOZO"
  ),
  newUser(
    "native",
    "user",
    "bbbb123456",
    "bbbb123456@fakemail.com",
    "$2b$10$Sd3DjzL/atGLfPcdCzq0AOH8uPRdRq8jzxBfXR.mVyQjWme8Jv11u"
  ),
  newUser(
    "native",
    "user",
    "cccc123456",
    "cccc123456@fakemail.com",
    "$2b$10$OFCQ.3eScwr7BFcLpW8Icu5M4c8gtP1Oin6GE/MQBCs4k2SSl47i2"
  ),
]).then((user) => {
  console.log("%j", user);
});
