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
async function newProduct(data, product_id = 0) {
  if (product_id == 0) {
    product_id = getTimeID();
  }
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
    variants,
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
  console.log("insert product: %j", data.variants.length);
  try {
    if (rows.insertId == undefined) return undefined;
    const { variants, colors } = await setVariantsAndColor(
      product_id,
      data.variants
    );
    if (variants == undefined || colors == undefined) return undefined;
    const product = await getProductById(product_id);
    return product;
  } catch (err) {
    console.log(err);
    return undefined;
  }
}
async function setVariantsAndColor(product_id, data) {
  // console.log("set variant data length:" + data.length);
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    const variants = await pool.query(
      `
      INSERT INTO variant (product_id,color_code,color_name, size,stock)
      VALUES (?,?,?,?,?)
      ;
        `,
      [product_id, v.color_code, v.color_name, v.size, v.stock]
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
    // console.log(`set variants ${i}: ${JSON.stringify(variants)}`);
    // console.log(`set colors ${i}: ${JSON.stringify(colors)}`);
  }
  const rows = await getVariantsAndColors(product_id);
  // console.log(`set variant and color rows: ${JSON.stringify(rows)}`);
  if (!rows || rows.variants.length != data.length) {
    return undefined;
  } else {
    return rows;
  }
}

async function getProductRowsCountCategory(category) {
  let condition = category == "all" ? "" : "WHERE category = ?";
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS product_count
    FROM product
    ` + condition,
    [category]
  );
  // console.log("product count: %j",rows[0] );
  if (rows.length == 0 || !rows[0].product_count) {
    return undefined;
  } else {
    return Number(rows[0].product_count);
  }
}
async function getProductRowsCountSearch(keyword) {
  const [rows] = await pool.query(
    `
    SELECT COUNT(*) AS product_count
    FROM product WHERE title LIKE ? 
    `,
    [keyword]
  );
  // console.log("product count: %j",rows[0] );
  if (rows.length == 0 || !rows[0].product_count) {
    return undefined;
  } else {
    return Number(rows[0].product_count);
  }
}
async function getProductIdList() {
  const [rows] = await pool.query(
    `
      SELECT id FROM product ORDER BY id ASC;
    `
  );
  // console.log("productID list: %j",rows );
  if (rows.length == 0) {
    return undefined;
  } else {
    return rows;
  }
}
async function getProductById(product_id) {
  //---------------For Ubuntu -----------------------
  const [rows] = await pool.query(
    `
    SELECT
      p.id,
      p.category,
      p.title,
      p.description,
      p.price,
      p.texture,
      p.wash,
      p.place,
      p.note,
      p.story,
      p.main_image,      
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('code', c.code, 'name', c.name)) FROM color c WHERE c.product_id=p.id) AS colors,
      (SELECT JSON_ARRAYAGG(size) AS sizes
        FROM (
          SELECT DISTINCT v.size
          FROM variant v
          WHERE v.product_id = p.id
          ORDER BY v.size DESC
        ) AS unique_sizes) AS sizes,
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('color_code', v.color_code, 'size', v.size, 'stock', v.stock)) FROM variant v WHERE v.product_id=p.id) AS variants,
      p.images
    FROM
      product p
    WHERE
      p.id = ?;
    `,
    [product_id]
  );
  // console.log("get product: %j", rows);
  try {
    if (rows == undefined) return undefined;
    const product = transToCdnUrl(rows[0]);
    return product;
  } catch (err) {
    console.log(err);
    return undefined;
  }
}
async function getProductsByCategory(category) {
  let condition = category == "all" ? "" : "WHERE category = ?";
  const [rows] = await pool.query(
    `
    SELECT id FROM product 
    ${condition} 
    ORDER BY id ASC
    `[category]
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    // console.log("getCategory:" + JSON.stringify(rows));
    return getProductListWindowData(rows);
  }
}
async function getProductsSearchResult(keyword) {
  const [rows] = await pool.query(
    `
    SELECT * FROM product WHERE title LIKE ? 
    ORDER BY id ASC
    `,
    [keyword]
  );
  // const [rows] = await pool.query(`SELECT * FROM user where id = ${id}`);
  if (rows.length == 0) {
    return undefined;
  } else {
    // console.log("getSearch:" + JSON.stringify(rows[0]));
    return getProductListWindowData(rows);
  }
}
async function getVariantColorByProductDetail(product_id, color_code,color_name,size){
  const [rows] = await pool.query(
    `
      SELECT * FROM variant 
      WHERE product_id = ? AND color_code = ? AND color_name = ? AND size = ?;
      `,
    [product_id, color_code, color_name, size]
  );
  return rows;
}
async function getVariantsAndColors(product_id) {
  const [variants] = await pool.query(
    `
      SELECT product_id,color_code, size,stock FROM variant WHERE product_id = ?;
      `,
    [product_id]
  );
  const [colors] = await pool.query(
    `
    SELECT product_id,code,name FROM color WHERE product_id = ?;
    `,
    [product_id]
  );
  // console.log(`get variants: ${JSON.stringify(variants)}`);
  // console.log(`get colors: ${JSON.stringify(colors)}`);
  if (variants.length == 0 || colors.length == 0) {
    return undefined;
  } else {
    const rows = {
      variants: variants,
      colors: colors,
    };
    // console.log(`get rows: ${JSON.stringify(rows)}`);
    return rows;
  }
}
async function getWindowDataByCategory(category, start, pageSize) {
  let condition = category == "all" ? "" : ` WHERE category = '${category}'`;
  const [rows] = await pool.query(
    `
    SELECT
      p.id,
      p.title,
      p.price,
      p.main_image,      
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('code', c.code, 'name', c.name)) FROM color c WHERE c.product_id=p.id) AS colors
    FROM
      product p
    ${condition}
    LIMIT 
      ?, ?;
    `,
    [start, pageSize]
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    // console.log("getWindowData:" + JSON.stringify(rows));
    const products = rows.map((row) => {
      return transToCdnUrl(row);
    });
    return products;
  }
}
async function getWindowDataBySearch(keyword, start, pageSize) {
  const [rows] = await pool.query(
    `
    SELECT
      p.id,
      p.title,
      p.price,
      p.main_image,      
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('code', c.code, 'name', c.name)) FROM color c WHERE c.product_id=p.id) AS colors
    FROM
      product p
    WHERE p.title LIKE ? 
    LIMIT 
      ?, ?;
    `,
    [keyword, start, pageSize]
  );
  if (rows.length == 0) {
    return undefined;
  } else {
    const products = rows.map((row) => {
      return transToCdnUrl(row);
    });
    return products;
  }
}
function transToCdnUrl(product) {
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
  newProduct,
  getProductIdList,
  getProductById,
  getProductsByCategory,
  getProductsSearchResult,
  getProductRowsCountCategory,
  getProductRowsCountSearch,
  getWindowDataByCategory,
  getWindowDataBySearch,
  getVariantColorByProductDetail

};
