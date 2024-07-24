const moment = require("moment");
const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();
const { newCampaign } = require("./db/marketing-model");
const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();
const expire_date = moment().add(10, "days").format("YYYY-MM-DD");
console.log(expire_date);

const data1 = {
  title: "Be Your Bestman!",
  product: 20240522024929,
  image: "campaign-0-59d258184052e0b863d59524a55cd078",
  story: "It's a love story, please just say yes.",
  expire: expire_date,
};
const data2 = {
  title: "Lady Season",
  product: 20240522025002,
  image: "campaign-0-f8e859a1e1351a211cf88c00a12bea84",
  story: "Skirt is just the way you are.",
  expire: expire_date,
};
const data3 = {
  title: "Accessories Warm You Up",
  product: 20240522025059,
  image: "campaign-0-42d41209e9c5ef87a7941a21ed86d321",
  story: "touching your heart.",
  expire: expire_date,
};
const datas = [data1, data2, data3];
Promise.all(
  datas.map((data) => {
    return newCampaign(data);
  })
).then((campaign) => {
  console.log("%j", campaign);
});
