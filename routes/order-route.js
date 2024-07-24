const router = require("express").Router();
const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config();

const { authJwtCheckLogin } = require("../middleware/authenticate");
const { cacheUserAndShoppingRecord } = require("../middleware/checkCache");
const { setRedis, getRedis, deleteRedis } = require("../db/redis-cache");
const {
  newOrder,
  getOrder,
  getVariantId,
  getShoppingVariantList,
  getShoppingList,
  sumPriceInList,
  addShoppingList,
  deleteShoppingList,
  setRecipientInfo,
  getRecipientInfo,
  setPayInfo,
} = require("../db/order-model");
const { getUserRecipient, getUserPayInfo } = require("../db/user-model");

const shipping = {
  UNPAID: "unpaid", //unpaid
  CONFIRMED: "confirmed", //payed
  DELIVERY: "delivery", //transfering
  COMPLETED: "completed", //arrived
  CANCELLED: "cancelled", //return
};
const payment = {
  CREDIT_CARD: "credit_card",
  CASH_ON_DELIVERY: "cash_on_delivery",
};
const freightFee = {
  TW: 60,
  Islands: 100,
  HK: 150,
  SG: 250,
  MY: 200,
};

const pool = mysql
  .createPool({
    host: process.env.AWS_RDS_HOST,
    user: process.env.AWS_RDS_USERNAME,
    password: process.env.AWS_RDS_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

router.get("/checkout", async (req, res) => {
  const { user } = req;
  try {
    let shoppingCount = 0;
    if (user && user.shoppingList) {
      shoppingCount = user.shoppingList.length;
    }
    const shoppingList = await getShoppingList(user.id);
    const recipient = await getRecipientInfo(user.id);
    if (shoppingList.length != 0) {
      const priceList = shoppingList.map((product) => {
        return Number(product.total);
      });
      const subtotal = priceList.reduce((sum, price) => sum + price);
      res.render("checkout", {
        shoppingList,
        subtotal,
        recipient,
        shoppingCount,
      });
    } else {
      res.render("checkout", {
        shoppingList,
        subtotal: 0,
        recipient: undefined,
        shoppingCount,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});

router.post("/checkout", async (req, res) => {
  //req spec : { prime, order }
  const { user } = req;
  const { prime, payMethod, checkoutCost, deliverData } = req.body; //The prime token from TapPay only be used once.
  console.log(`payMethod: ${payMethod}, prime: ${prime}`);
  try {
    if (user) {
      if (deliverData.isSaveDeliverInfo) {
        const recipientInfo = await setRecipientInfo(
          user.id,
          deliverData.inputReceiveName,
          deliverData.inputReceivePhone,
          deliverData.inputReceiveEmail,
          deliverData.deliverSection,
          deliverData.address,
          deliverData.deliverTime
        );
        console.log("set recipientInfo success: %j", recipientInfo);
      }
      // const payInfo = await setPayInfo(user.id, name, phone, email, credit_card, expire_date);
      // console.log("set payInfo success: %j", payInfo);

      const subtotal = await sumPriceInList(user.id);
      const freight = freightFee[deliverData.deliverSection];
      const total = subtotal + freight;
      console.log("total:" + subtotal);
      // if(checkoutCost.subtotalPrice != subtotal || checkoutCost.freightPrice != freight || checkoutCost.totalPrice != total)
      // {
      //   return res.status(400).send({ message: "the subtotal/freight/total information of order is mismatched."});
      // }
      const order_id = await newOrder(
        user.id,
        shipping.UNPAID,
        payMethod,
        subtotal,
        freight,
        total
      );
      const order = await getOrder(order_id);

      if (payMethod == payment.CREDIT_CARD) {
        const payInfo = {
          prime: prime,
          amount: total,
          phone_number: "+886923456789",
          name: user.name,
          email: user.email,
        };
        const result = await paymentTransaction(
          order_id,
          user.id,
          order,
          payInfo
        );
        if (result.isSuccess) {
          console.log("pay success.");
          user.shoppingList = [];
          await setRedis(user.id, user);
          return res.status(200).send({ order_id, message: result.message });
        } else {
          console.log("pay failed.");
          return res.status(400).send({ message: result.message });
        }
      } else {
        //payment.CASH_ON_DELIVERY
        return res
          .status(200)
          .send({ order_id, message: "Order is Confirmed!" });
      }
    } else {
      return res
        .status(400)
        .send({ message: "server fail to get user or order information!" });
    }
  } catch (err) {
    console.log("error" + err);
    return res.status(500).send({ message: err.message });
  }
});

router.post("/addCart", async (req, res) => {
  const { user } = req;
  const { product_id, color_code, size, qty } = req.body;
  try {
    const list = [];
    for (let i = 0; i < qty; i++) {
      user.shoppingList.push({ product_id, color_code, size });
      const goods = await addShoppingList(
        user.id,
        product_id,
        color_code,
        size
      );
      if (goods != undefined) {
        list.push(goods);
      }
    }
    await setRedis(user.id, user); // update redis shoppingList
    if (list.length == qty) {
      res.status(200).send({ meaasge: "Goods in shopping cart successfully!" });
    } else {
      res.status(500).send({ message: "Something wrong with insert goods" });
    }
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});

router.post("/deleteCart", async (req, res) => {
  const { user } = req;
  const { product_id, color_code, size } = req.body;
  try {
    // delete all same product items
    const goods = await deleteShoppingList(
      user.id,
      product_id,
      color_code,
      size
    );
    user.shoppingList = user.shoppingList.filter(
      (a) => a.product_id !== product_id
    );
    await setRedis(user.id, user); // update redis shoppingList

    if (goods) {
      res.status(200).send({ meaasge: "Goods is removed successfully!" });
    } else {
      res.status(500).send({ message: "Something wrong with delete goods" });
    }
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
  }
});
//---------------------------
//------  Function ---------
//---------------------------
function lockVariantRowsForWrite(connection, product) {
  const { id, color, size, qty } = product;
  return new Promise(async (resolve, reject) => {
    try {
      //Exclusive Locks
      await connection.query(
        `
          SELECT * FROM variant
          WHERE product_id = ? AND color_code = ? AND size = ?
          FOR UPDATE;
        `,
        [id, color.code, size]
      );
      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
}
function updateProductStock(connection, product) {
  const { id, color, size, qty } = product;
  return new Promise(async (resolve, reject) => {
    try {
      await connection.query(
        `
          UPDATE variant
          SET stock = stock - ?
          WHERE product_id = ? AND color_code = ? AND size = ?;
        `,
        [qty, id, color.code, size]
      );
      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
}
function updateShoppingListRecord(connection, order_id, user_id, product) {
  const { id, color, size, qty } = product;
  return new Promise(async (resolve, reject) => {
    try {
      await connection.query(
        `
        UPDATE shopping_list
        SET order_id = ?
        WHERE \`user_id\` = ? 
        AND \`product_id\` = ?
        AND \`product_color\` = ?
        AND \`product_size\` = ?
        LIMIT ?;
          `,
        [order_id, user_id, id, color.code, size, qty]
      );
      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
}
function updateOrderStatusAndTradeId(
  connection,
  order_id,
  user_id,
  status,
  rec_trade_id
) {
  return new Promise(async (resolve, reject) => {
    try {
      await connection.query(
        `
            UPDATE \`order\`
            SET shipping = ?, trade_id = ?
            WHERE id = ? AND user_id = ?;
          `,
        [status, rec_trade_id, order_id, user_id]
      );
      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
}
function tapPayFetch(payInfo) {
  const sandbox_url = "https://sandbox.tappaysdk.com/tpc/payment/pay-by-prime";
  const condition_url = "https://prod.tappaysdk.com/tpc/payment/pay-by-prime";
  const post_data = {
    prime: payInfo.prime,
    partner_key: process.env.PARTNER_KEY,
    merchant_id: process.env.MERCHANT_ID,
    amount: payInfo.amount,
    currency: "TWD",
    details: "Stylish Shopping Online",
    cardholder: {
      phone_number: payInfo.phone_number,
      name: payInfo.name,
      email: payInfo.email,
    },
    remember: false, //true for remember card number
  };
  const config = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.PARTNER_KEY,
    },
    body: JSON.stringify(post_data),
  };
  return fetch(sandbox_url, config)
    .then(checkStatus)
    .then(checkResponse)
    .then((data) => {
      // data: {
      //   "status":0,
      //   "msg":"Success",
      //   "amount":1,
      //   "acquirer":"TW_CTBC",
      //   "currency":"TWD",
      //   "rec_trade_id":"D20240507oWsbQd",
      //   "bank_transaction_id":"TP20240507oWsbQd",
      //   "order_number":"",
      //   "auth_code":"341825",
      //   "card_info":{"issuer":"","funding":0,"type":1,"level":"","country":"UNITED KINGDOM","last_four":"4242","bin_code":"424242","issuer_zh_tw":"","bank_id":"","country_code":"GB"},
      //   "transaction_time_millis":1715069910650,
      //   "bank_transaction_time":{"start_time_millis":"1715069910694","end_time_millis":"1715069910694"},
      //   "bank_result_code":"",
      //   "bank_result_msg":"",
      //   "card_identifier":"dee921560b074be7a860a6b44a80c21b",
      //   "merchant_id":"AppWorksSchool_CTBC",
      //   "is_rba_verified":false,
      //   "transaction_method_details":{"transaction_method_reference":"REQUEST","transaction_method":"FRICTIONLESS"}
      // }
      const tapPay = {
        status: data.status,
        msg: data.msg,
        rec_trade_id: data.rec_trade_id,
        bank_transction_id: data.bank_transction_id,
        auth_code: data.auth_code,
      };
      if (data.status == 0) return tapPay;
      else return new Error("tapPay error: " + tapPay.msg);
    })
    .catch((err) => {
      console.error("tapPay error:", err);
    });
}

function fetchDataFromThirdParty() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      data = {
        status: 0,
        msg: "Success",
        rec_trade_id: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      };
      resolve(data);
      // reject (new Error("Simulate fetch fail."));
    }, 5000); // Simulating a 5-second delay
  });
}
async function paymentTransaction(order_id, user_id, order, payInfo) {
  const result = { isSuccess: false, message: "" };
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    console.log("paymentTransaction Start!");

    await Promise.all(
      order.list.map((product) => {
        lockVariantRowsForWrite(connection, product);
      })
    );
    await Promise.all(
      order.list.map((product) => {
        const updateProduct = updateProductStock(connection, product);
        const updateShoppingList = updateShoppingListRecord(
          connection,
          order_id,
          user_id,
          product
        );
        return Promise.all([updateProduct, updateShoppingList]);
      })
    );
    console.log("Stocks/ List Record is up to date!");
    // const data = await fetchDataFromThirdParty();
    const data = await tapPayFetch(payInfo);
    console.log("get payData: %j", data);

    await updateOrderStatusAndTradeId(
      connection,
      order_id,
      user_id,
      shipping.CONFIRMED,
      data.rec_trade_id
    );

    //the lock on the row will be released after commit
    await connection.commit();
    result.isSuccess = true;
    result.message = "Payment Transaction is Committed.";
  } catch (err) {
    await connection.rollback();
    console.error("Transaction rolled back:" + err.message);
    result.isSuccess = false;
    result.message = err.message;
  } finally {
    if (connection) {
      connection.release();
      console.log("connection is released.");
    }
  }
  return result;
}
function checkStatus(res) {
  if (res.ok) {
    return Promise.resolve(res);
  } else {
    return Promise.reject(new Error(res.statusText));
  }
}
function checkResponse(res) {
  if (res.redirected) {
    location.href = res.url;
    return;
  } else {
    return res.json();
  }
}
module.exports = router;
