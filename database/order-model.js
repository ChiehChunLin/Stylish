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
async function newOrder(
  user_id,
  shipping,
  payment,
  subtotal,
  freight,
  total,
  order_id = 0
) {
  if (order_id == 0) {
    order_id = getTimeID();
  }
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
async function getOrder(order_id) {
  const [rows] = await pool.query(
    `
    SELECT
    o.shipping,
    o.payment,
    o.subtotal,
    o.freight,
    o.total,   
    (
        SELECT JSON_OBJECT(
            'name', r.name,
            'phone', r.phone,
            'email', r.email,
            'address', r.address,
            'time', r.time
        )
        FROM recipient r
        WHERE r.user_id = o.user_id
    ) AS recipient,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', qty.id,
                'name', p.title,
                'price', p.price * qty.qty, 
                'color', JSON_OBJECT('code', qty.color, 'name', c.name),
                'size', qty.size,
                'qty', qty.qty
            )
        ) 
        FROM (
            SELECT 
                s.product_id AS id,
                s.product_color AS color,
                s.product_size AS size,
                COUNT(*) AS qty
            FROM shopping_list s 
            WHERE s.user_id = o.user_id
            GROUP BY s.product_id, s.product_color, s.product_size
        ) AS qty
        JOIN product p ON qty.id = p.id
        JOIN color c ON qty.id = c.product_id AND qty.color = c.code
    ) AS list
    FROM
      \`order\` o
    WHERE
      o.id = ?;
    `,
    [order_id]
  );
  // console.log("getOrder:" + JSON.stringify(rows));
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows[0];
  }
}
async function updateOrderStatus(order_id, user_id, status) {
  const variants = await pool.query(
    `
      UPDATE order
      SET shipping = ?
      WHERE id = ? AND user_id = ? ;
      `,
    [status, order_id, user_id]
  );
  console.log("update stock: " + JSON.stringify(variants));
}

async function getVariantId(product_id, product_color, product_size) {
  const [rows] = await pool.query(
    `
      SELECT id 
      FROM variant 
      WHERE 
        product_id = ? AND color_code = ? AND size =?;
      `,
    [product_id, product_color, product_size]
  );
  if (rows == undefined || rows[0] == undefined) {
    return undefined;
  } else {
    return rows[0];
  }
}
async function getShoppingVariantList(user_id) {
  const [rows] = await pool.query(
    `
      SELECT variant_id 
      FROM shopping_list 
      WHERE 
        user_id = ?;
      `,
    [user_id]
  );
  if (rows == undefined) {
    return undefined;
  } else {
    return rows;
  }
}
async function getShoppingList(user_id) {
  const [rows] = await pool.query(
    `
    SELECT
      p.id,
      p.title,    
      p.main_image,
      (SELECT v.id FROM variant v WHERE v.product_id = sh.product_id AND v.color_code = sh.product_color AND v.size = sh.product_size) AS variant_id,
      sh.product_color AS color,
      (SELECT c.name FROM color c WHERE c.product_id = sh.product_id AND c.code = sh.product_color) AS color_name,
      sh.product_size AS size,
      COUNT(*) AS qty,
      p.price,
      COUNT(*) * p.price AS total
    FROM
      shopping_list sh
    JOIN product p ON p.id = sh.product_id
    WHERE
      order_id IS NULL AND user_id = ?
    GROUP BY
      product_id,
      product_color,
      product_size;
    `,
    [user_id]
  );
  // console.log("getShoppingList:" + JSON.stringify(rows));
  const products = rows.map((row) => {
    return transToCdnUrl(row);
  });
  return products;
}
async function getShoppingCount(user_id) {
  const [rows] = await pool.query(
    `
      SELECT 
        COUNT(DISTINCT product_id, product_color, product_size) AS count 
      FROM 
        shopping_list 
      WHERE 
        user_id = ?;
    `,
    [user_id]
  );
  //  console.log("getShoppingCount:" + JSON.stringify(rows));
  if (rows == undefined) {
    return 0;
  } else {
    return Number(rows[0].count);
  }
}
async function sumPriceInList(user_id) {
  const [rows] = await pool.query(
    `
    SELECT
      SUM(p.price) AS sum_price
    FROM
      shopping_list sl
    JOIN
      product p ON sl.product_id = p.id
    WHERE 
      sl.user_id = ?
    `,
    [user_id]
  );
  console.log("sumPrice: %j", rows[0]);
  if (rows.length == 0 || !rows[0].sum_price) {
    return undefined;
  } else {
    return Number(rows[0].sum_price);
  }
}
async function priceShoppingList(user_id) {
  const [rows] = await pool.query(
    `
    SELECT
      p.price
    FROM
      shopping_list sl
    JOIN
      product p ON sl.product_id = p.id
    WHERE 
      sl.user_id = ?
    `,
    [user_id]
  );
  console.log("sumPrice:" + JSON.stringify(rows));
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows;
  }
}
async function addShoppingList(
  user_id,
  product_id,
  product_color,
  product_size
) {
  const [rows] = await pool.query(
    `INSERT INTO shopping_list (user_id,product_id,product_color,product_size)
        VALUES (?,?,?,?)
        `,
    [user_id, product_id, product_color, product_size]
  );
  console.log(`addShopping: ${JSON.stringify(rows)}`);
  if (rows == undefined) {
    return undefined;
  } else {
    return rows.insertId;
  }
}
async function deleteShoppingList(
  user_id,
  product_id,
  product_color,
  product_size
) {
  const [rows] = await pool.query(
    `DELETE FROM shopping_list 
     WHERE \`user_id\` = ? 
     AND \`product_id\` = ?
     AND \`product_color\` = ?
     AND \`product_size\` = ?
     ;
    `,
    [user_id, product_id, product_color, product_size]
  );
  console.log(`deleteShopping: ${JSON.stringify(rows)}`);
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows;
  }
}
async function setRecipientInfo(
  user_id,
  name,
  phone,
  email,
  country,
  address,
  time
) {
  const [rows] = await pool.query(
    `INSERT INTO recipient (user_id,name,phone,email,country,address,time)
        VALUES (?,?,?,?,?,?,?)
        `,
    [user_id, name, phone, email, country, address, time]
  );
  console;
  if (rows == undefined || rows.insertId == undefined) {
    return undefined;
  } else {
    return rows;
  }
}
async function getRecipientInfo(user_id) {
  const [rows] = await pool.query(
    `SELECT * FROM recipient 
     WHERE user_id = ?
        `,
    [user_id]
  );
  if (rows.length == undefined) {
    return undefined;
  } else {
    return rows[0];
  }
}
async function setPayInfo(
  user_id,
  name,
  phone,
  email,
  credit_card,
  expire_date
) {
  const [rows] = await pool.query(
    `INSERT INTO pay_info (user_id,name,phone,email,credit_card,expire_date)
        VALUES (?,?,?,?,?,?)
        `,
    [user_id, name, phone, email, credit_card, expire_date]
  );
  if (rows.length == 0 || !rows.insertId) {
    return undefined;
  } else {
    return rows[0];
  }
}

async function getPayData() {
  const [rows] = await pool.query(
    `
    SELECT
      user_id,
      total
    FROM
      \`order\`
    WHERE 
      1
    `
  );
  console.log("payData length: ", rows.length);
  if (rows == undefined || rows[0] == undefined) {
    return undefined;
  } else {
    return rows;
  }
}
function transToCdnUrl(product) {
  console.log(product);
  if (product == undefined) return [""];
  product.main_image = getImageCDN(product.main_image);
  if (product.images != undefined) {
    product.images.forEach((img) => {
      img = getImageCDN(img);
    });
  }
  return product;
}
module.exports = {
  newOrder,
  getOrder,
  updateOrderStatus,
  getVariantId,
  getShoppingVariantList,
  getShoppingList,
  getShoppingCount,
  sumPriceInList,
  priceShoppingList,
  addShoppingList,
  deleteShoppingList,
  setRecipientInfo,
  getRecipientInfo,
  setPayInfo,
  getPayData,
};
