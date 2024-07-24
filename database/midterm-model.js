const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();
const { getTimeID, getCryptoID } = require("./initDataId");
const { getImageCDN } = require("../controller/s3");

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
async function newOrder( order_id, user_id,
    shipping,
    payment,
    subtotal,
    freight,
    total
  ) {
    const [rows] = await pool.query(
      `INSERT INTO \`order\` (id, user_id,shipping,payment,subtotal,freight,total)
       VALUES (?,?,?,?,?,?,?)
      `,
      [order_id, user_id, shipping, payment, subtotal, freight, total]
    );
    // console.log("newOrder:" + JSON.stringify(rows));
    try {
      if (rows == undefined) return undefined;
      return order_id;
    } catch (err) {
      console.log(err);
      return undefined;
    }
}
async function getSumOrders(user_id){
  const [rows] = await pool.query(
    `
    SELECT
      SUM(total) AS revenue
    FROM
      \`order\`
    WHERE 
      user_id = ?
    `,
    [user_id]
  );
  // console.log("getSumOrders: ", rows[0]);
  if(rows != undefined) return Number(rows[0].revenue);
  else return undefined;
}
async function insertProduct(product_id, data){
    try{
        const {
            title,
            price,
            category,
            description,
            texture,
            wash,
            place,
            note,
            story,
            main_image,
            images,
          } = data;
          const [rows] = await pool.query(
            `INSERT INTO product (id,title,price,category,description,texture,wash,place,note,story,main_image,images)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,JSON_ARRAY(?))
            `,
            [
              product_id,
              title,
              price,
              category,
              description,
              texture,
              wash,
              place,
              note,
              story,
              main_image,
              images,
            ]
          );
          console.log(`insert product: ${JSON.stringify(rows[0])}`);
          if(rows != undefined) return product_id;
          else return undefined;
    }catch(err){
        console.log("insertProduct Error: " + err.message);
    }
      
}
async function insertVariant(product_id, v){
    try{
        const variants = await pool.query(
            `
            INSERT INTO variant (product_id,color_code,color_name, size,stock)
            VALUES (?,?,?,?,?)
            ;
              `,
            [product_id, v.color_code, v.color_name, v.size, v.stock, product_id, v.color_code, v.color_name, v.size, v.stock]
          );
          // ignore the same row without error
          const colors = await pool.query(
            `
            INSERT INTO color (product_id, code, name)
            SELECT ?, ?, ?
            FROM dual
            WHERE NOT EXISTS (
                SELECT *
                FROM color
                WHERE product_id= ? AND code = ? AND name = ?
            );
              `,
            [
              product_id,
              v.color_code,
              v.color_name,
              product_id,
              v.color_code,
              v.color_name,
            ]
          );
        //   console.log(`set variants : ${JSON.stringify(variants)}`);
        //   console.log(`set colors : ${JSON.stringify(colors)}`);
        
          if(colors && variants) return true;
          else return false;

    }catch(err){
        console.log("insertVariant Error: " + err.message);
    }    
}
async function addShoppingList(
    order_id,
    user_id,
    product_id,
    product_color,
    product_size
  ) {
    const [rows] = await pool.query(
      `INSERT INTO shopping_list (order_id, user_id,product_id,product_color,product_size)
          VALUES (?,?,?,?,?)
          `,
      [order_id, user_id, product_id, product_color, product_size]
    );
    // console.log(`addShopping: ${JSON.stringify(rows)}`);
    if (rows == undefined) {
      return undefined;
    } else {
      return rows.insertId;
    }
}
async function getSoldQuantity(user_id){
  const [rows] = await pool.query(
    `
    SELECT
      COUNT(*) AS qty
    FROM
      shopping_list
    WHERE 
      user_id = ?
    `,
    [user_id]
  );
  // console.log("Sold Quantity: ", rows[0]);
  if(rows != undefined) return Number(rows[0].qty);
  else return undefined;
}
async function getDistinctColor(user_id){
  const [rows] = await pool.query(
    `SELECT DISTINCT product_color 
     FROM shopping_list
     WHERE user_id = ?
    `,
    [user_id]
  );
  console.log(`getDistinctColor: ${JSON.stringify(rows)}`);
  if (rows == undefined) {
    return undefined;
  } else {
    return rows;
  }
}
async function getColorCount(user_id, color_code){
  const [rows] = await pool.query(
    `
    SELECT 
      COUNT(*) AS qty,
      (SELECT JSON_OBJECT('code',c.code,'name', c.name) FROM color c WHERE c.code=sl.product_color LIMIT 1) AS color
    FROM 
      shopping_list sl
    WHERE user_id = ? AND product_color = ?
    `,
    [user_id, color_code]
  );
  // console.log(`getColorCount: ${JSON.stringify(rows)}`);
  if (rows == undefined) {
    return undefined;
  } else {
    return rows[0];
  }
}
async function getPriceList(user_id){
  const [rows] = await pool.query(
    `
    SELECT
      p.price AS price
    FROM
      shopping_list sl
    JOIN
      product p ON sl.product_id = p.id
    WHERE 
      sl.user_id = ?
    `,
    [user_id]
  );
  // console.log(`getPriceList: ${JSON.stringify(rows)}`);
  if (rows == undefined) {
    return undefined;
  } else {
    return rows;
  }
}
async function getSoldProductIDs(user_id){
  const [rows] = await pool.query(
    `
    SELECT
      product_id
    FROM
      shopping_list 
    WHERE 
      user_id = ?
    `,
    [user_id]
  );
  // console.log(`getSoldProductIDs: ${JSON.stringify(rows)}`);
  if (rows == undefined) {
    return undefined;
  } else {
    return rows;
  }
}

async function getProductSize(user_id, product_id){
  const [rows] = await pool.query(
    `
    SELECT
       p.title AS title,
       COUNT(product_size='S') AS S, 
       COUNT(product_size='M') AS M, 
       COUNT(product_size='L') AS L 
    FROM shopping_list sh
    JOIN product p ON p.id = sh.product_id
    WHERE user_id = ? AND product_id = ?;
    `,
    [user_id,product_id]
  );
  // console.log(`getProductSize: ${JSON.stringify(rows)}`);
  if (rows == undefined) {
    return undefined;
  } else {
    return rows[0];
  }
}
module.exports = {
  newOrder, getSumOrders, insertProduct, insertVariant, addShoppingList,
  getSoldQuantity,getDistinctColor,getColorCount,getPriceList,getSoldProductIDs,
  getProductSize
};