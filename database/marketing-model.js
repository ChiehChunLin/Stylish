const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();
const { getImageCDN } = require("../controller/s3");

const pool = mysql
  .createPool({
    host: process.env.AWS_RDS_HOST , //MYSQL_HOST      //AWS_RDS_HOST
    user: process.env.AWS_RDS_USERNAME, //MYSQL_USER      //AWS_RDS_USERNAME
    password: process.env.AWS_RDS_PASSWORD, //MYSQL_PASSWORD  //AWS_RDS_PASSWORD
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

//----------------------------------------------------------------
//----------------          Functions          -------------------
//----------------------------------------------------------------
async function newCampaign(data) {
  const { title, product, image, story, start, expire } = data;
  const [rows] = await pool.query(
    `INSERT INTO campaign (title,product_id,image, story, expire)
    VALUES (?,?,?,?,?)
    `,
    [title, product, image, story, expire]
  );
  if (!rows || !rows.insertId) {
    return undefined;
  } else {
    const id = rows.insertId;
    return getCampaignById(id);
  }
}
async function getCampaignById(id) {
  const [rows] = await pool.query(
    `
     SELECT * FROM campaign WHERE id = ?
    `,
    [id]
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows[0];
  }
}
async function getAllCampaigns() {
  const [rows] = await pool.query(
    `
     SELECT * FROM campaign
    `
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    rows.forEach((d) => {
      d.image = getImageCDN(d.image);
    });
    return rows;
  }
}
async function getProductTitleList() {
  const [rows] = await pool.query(
    `
      SELECT id, title FROM product ORDER BY id ASC
      `
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows;
  }
}
async function getCampaignTitleList() {
  const [rows] = await pool.query(
    `
    SELECT id, title  FROM campaign ORDER BY id ASC
    `
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows;
  }
}
async function getHotsData(title) {
  const [rows] = await pool.query(
    `
        SELECT *
        FROM hots
        WHERE title = '?'
        `,
    [title]
  );
  // const [rows] = await pool.query(`SELECT * FROM article WHERE id = ${id}`);
  if (rows.length == 0) {
    return undefined;
  } else {
    // console.log("getArticle:" + JSON.stringify(rows[0]));
    return rows;
  }
}

module.exports = {
  newCampaign,
  getAllCampaigns,
  getProductTitleList,
  getCampaignTitleList,
  getHotsData,
};
