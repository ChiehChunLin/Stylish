const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.AWS_RDS_HOST, //MYSQL_HOST      //AWS_RDS_HOST
    user: process.env.AWS_RDS_USERNAME, //MYSQL_USER      //AWS_RDS_USERNAME
    password: process.env.AWS_RDS_PASSWORD, //MYSQL_PASSWORD  //AWS_RDS_PASSWORD
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

//----------------------------------------------------------------
//----------------          Functions          -------------------
//----------------------------------------------------------------
async function newUser(provider, role, name, email, password, picture = "") {
  const [rows] = await pool.query(
    `INSERT INTO user (provider,role,name,email,password, picture)
    VALUES (?,?,?,?,?,?)
    `,
    [provider, role, name, email, password, picture]
  );
  // console.log("newUser:" + JSON.stringify(rows));
  if (rows.length == 0 || !rows.insertId) {
    return undefined;
  } else {
    const user_id = rows.insertId;
    return getUser(user_id);
  }
}
async function getUser(id) {
  const [rows] = await pool.query(
    `
    SELECT * FROM user where id = ?
    `,
    [id]
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows[0];
  }
}
async function getUserByEmail(email) {
  const [rows] = await pool.query(
    `
    SELECT * FROM user where email = ?
    `,
    [email]
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows[0];
  }
}
async function getUserRecipient(id) {
  const [rows] = await pool.query(
    `
    SELECT * FROM recipient where user_id = ?
    `,
    [id]
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows[0];
  }
}
async function getUserPayInfo(id) {
  const [rows] = await pool.query(
    `
    SELECT * FROM pay_info where user_id = ?
    `,
    [id]
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows[0];
  }
}
module.exports = {
  newUser,
  getUser,
  getUserByEmail,
  getUserPayInfo,
  getUserRecipient,
};
