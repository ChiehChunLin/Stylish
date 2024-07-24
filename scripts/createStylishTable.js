const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();
async function createUserTable() {
  const userTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`user\` (
            \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'User id',
            \`provider\` VARCHAR(255) NOT NULL COMMENT 'Service Provider',
            \`role\` VARCHAR(255) NOT NULL DEFAULT 'user' COMMENT 'User Role',
            \`name\` VARCHAR(255) NOT NULL COMMENT 'User name',
            \`email\` VARCHAR(255) NOT NULL UNIQUE KEY COMMENT 'User email',
            \`password\` VARCHAR(255) NOT NULL COMMENT 'User password',
            \`picture\` VARCHAR(255) NOT NULL COMMENT 'User picture',
            \`timestamp\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );`
  );
  if (userTable) console.log("userTable is ready for service.");
}
async function createOrderTable() {
  const orderTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`order\` (
            \`id\` BIGINT UNSIGNED PRIMARY KEY COMMENT 'Order Id',
            \`user_id\` BIGINT UNSIGNED COMMENT 'User Id',
            \`shipping\` VARCHAR(255) NOT NULL COMMENT 'Order Shipping',
            \`payment\` VARCHAR(255) NOT NULL COMMENT 'Order Payment',
            \`subtotal\` INT(11) UNSIGNED COMMENT 'Order Subtotal',
            \`freight\` INT(11) UNSIGNED COMMENT 'Order Price excluded Freight Fee',
            \`total\` INT(11) UNSIGNED COMMENT 'Order Total Price',
            \`trade_id\` VARCHAR(255) COMMENT 'Order Trade Id.',
            \`timestamp\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES user(id)
          );`
  );
  if (orderTable) console.log("orderTable is ready for service.");
}
async function createShoppingListTable() {
  const shoppingListTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`shopping_list\` (
            \`order_id\` BIGINT UNSIGNED COMMENT 'Order id',         
            \`user_id\` BIGINT UNSIGNED COMMENT 'User id',
            \`variant_id\` BIGINT UNSIGNED COMMENT 'Variant id',
            \`product_id\` BIGINT UNSIGNED COMMENT 'Product id',
            \`product_color\` VARCHAR(255) NOT NULL COMMENT 'Product Color',
            \`product_size\` VARCHAR(255) NOT NULL COMMENT 'Product Size',
            FOREIGN KEY (order_id) REFERENCES \`order\`(id),
            FOREIGN KEY (user_id) REFERENCES user(id),
            FOREIGN KEY (variant_id) REFERENCES variant(id)
          );`
  );
  if (shoppingListTable) console.log("shoppingListTable is ready for service.");
}
async function createRecipientTable() {
  const recipientTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`recipient\` (
            \`user_id\` BIGINT UNSIGNED PRIMARY KEY COMMENT 'User id',
            \`name\` VARCHAR(255) NOT NULL COMMENT 'Recipient Name',
            \`phone\` VARCHAR(255) NOT NULL COMMENT 'Recipient Phone',
            \`email\` VARCHAR(255) NOT NULL COMMENT 'Recipient Email',
            \`country\` VARCHAR(255) NOT NULL COMMENT 'Recipient Country',
            \`address\` VARCHAR(255) NOT NULL COMMENT 'Recipient Address',
            \`time\` VARCHAR(255) NOT NULL COMMENT 'Recipient Time',
            FOREIGN KEY (user_id) REFERENCES user (id)
          );`
  );
  if (recipientTable) console.log("recipientTable is ready for service.");
}
async function createPayInfoTable() {
  const payInfoTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`pay_info\` (
            \`user_id\` BIGINT UNSIGNED PRIMARY KEY COMMENT 'User id',
            \`name\` VARCHAR(255) NOT NULL COMMENT 'Card Holder Name',
            \`phone\` VARCHAR(255) NOT NULL COMMENT 'Card Holder Phone',
            \`email\` VARCHAR(255) NOT NULL COMMENT 'Card Holder Email',
            \`credit_card\` VARCHAR(255) NOT NULL COMMENT 'Credit Card Number',
            \`expire_date\` VARCHAR(255) NOT NULL COMMENT 'Credit Card Expire Date',            
            FOREIGN KEY (user_id) REFERENCES user (id)
          );`
  );
  //ccv shouldn't be stored for auth check and for security
  if (payInfoTable) console.log("payInfoTable is ready for service.");
}

async function createProductTable() {
  const productTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`product\`  (
              \`id\` BIGINT NOT NULL PRIMARY KEY COMMENT 'Product id',
              \`category\` VARCHAR(255) NOT NULL COMMENT 'Product category',
              \`title\` VARCHAR(255) NOT NULL COMMENT 'Product title',
              \`description\` TEXT COMMENT 'Product description',
              \`price\` DECIMAL(10,2) NOT NULL COMMENT 'Product price',
              \`texture\` VARCHAR(255) COMMENT 'Product texture.',
              \`wash\` VARCHAR(255) COMMENT 'The way we can wash the product.',
              \`place\` VARCHAR(255) COMMENT 'Place of production.',
              \`note\` VARCHAR(255) COMMENT 'The note of product.',
              \`story\` TEXT COMMENT 'Product multiline story.',
              \`main_image\` VARCHAR(255) COMMENT 'Main image.',
              \`images\` JSON COMMENT 'images.',
              \`timestamp\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT product_title UNIQUE (title) 
            );`
    //images insert as an array: '["https://stylish.com/0.jpg", "https://stylish.com/1.jpg", "https://stylish.com/2.jpg"]'
  );
  if (productTable) console.log("productTable is ready for service.");
}
async function createColorTable() {
  const colorTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`color\`  (
          \`product_id\` BIGINT NOT NULL COMMENT 'Product Id.',
          \`code\` VARCHAR(7) COMMENT 'Color hex code.',
          \`name\` VARCHAR(255) COMMENT 'Color name.',          
          FOREIGN KEY (product_id) REFERENCES product(id)
    );`
  );
  if (colorTable) console.log("colorTable is ready for service.");
}
async function createVariantTable() {
  const variantTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`variant\`  ( 
          \`id\` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'Variant id',
          \`product_id\` BIGINT NOT NULL COMMENT 'Product Id.',
          \`color_code\` VARCHAR(7) COMMENT 'Hex Color Code.',
          \`color_name\` VARCHAR(255) COMMENT 'Color name.',
          \`size\` VARCHAR(255) COMMENT 'Size.',
          \`stock\` INT NOT NULL COMMENT 'Stock.',
          UNIQUE KEY (product_id, color_code, size),
          FOREIGN KEY (product_id) REFERENCES product(id),
          CONSTRAINT Stock_Limited CHECK (stock >= 0)
    );`
    //CONTRAINT uniqueVariant UNIQUE(color_code, size);
  );
  if (variantTable) console.log("variantTable is ready for service.");
}
async function createCampaignTable() {
  const campaignTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`campaign\`  (            
            \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Campaign ID.',
            \`title\` VARCHAR(255) NOT NULL COMMENT 'Campaign Title',
            \`product_id\` BIGINT NOT NULL COMMENT 'Product ID.',
            \`image\` VARCHAR(255) COMMENT 'Picture URL',
            \`story\` TEXT COMMENT 'Multiline story.',
            \`start\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Start Date',
            \`expire\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Expire Date',
            \`timestamp\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES product(id)
    );`
    //MySQL insert timestamp format: '2023-12-31 14:30:00' (NOTICE: localtime UTC Zone!!)
  );
  if (campaignTable) console.log("campaignTable is ready for service.");
}
async function createCampaignProductTable() {
  const campaignProductTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`campaign_products\`  (            
            \`campaign_id \` BIGINT NOT NULL COMMENT 'Campaign ID.',
            \`product_id \` BIGINT NOT NULL COMMENT 'Product ID.',
            PRIMARY KEY (campaign_id, product_id),
            FOREIGN KEY (campaign_id) REFERENCES Campaigns(id),
            FOREIGN KEY (product_id) REFERENCES Products(id)
    );`
  );
  if (campaignProductTable)
    console.log("campaign_products Table is ready for service.");
}
async function createHotsTable() {
  const hotsTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`hots\`  ( 
            \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Hots ID.',
            \`title\` VARCHAR(255) COMMENT 'Title of the hots section.',
            \`product_id\` BIGINT,
            FOREIGN KEY (product_id) REFERENCES product(id)
    );`
  );
  if (hotsTable) console.log("hotsTable is ready for service.");
}
async function createImageTable() {
  const categoryTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`images\`  ( 
              \`product_id\` BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Product ID.',        
              \`image\` INT COMMENT 'Product Image Path.'
      );`
  );
  if (categoryTable) console.log("categoryTable is ready for service.");
}
async function createCategoryTable() {
  const categoryTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`category\`  (     
            \`category\` INT COMMENT 'Product Category.'
    );`
  );
  if (categoryTable) console.log("categoryTable is ready for service.");
}
async function createFreightTable() {
  const freightTable = await pool.query(
    `CREATE TABLE IF NOT EXISTS \`freight\`  (   
            \`id\` INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Freight ID.',  
            \`country\` INT COMMENT 'Freight Country.',
            \`fee\` INT COMMENT 'Freight Fee.'
    );`
  );
  if (freightTable) console.log("freightTable is ready for service.");
}

createUserTable();
createProductTable();
createVariantTable();
createColorTable();
createOrderTable();
createShoppingListTable();
createRecipientTable();
createPayInfoTable();
createCampaignTable();
// createHotsTable();
// createImageTable();
// createCategoryTable();
// createFreightTable();
