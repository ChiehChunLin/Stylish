const { newOrder } = require("./db/order-model");
const { getTimeID } = require("./db/initDataId");

const user = Math.floor(Math.random() * 6) + 1; //1~6
const quantity = Math.floor(Math.random() * 3) + 1; //1~3

//generate number data per each user
const number = 50;
const start_id = getTimeID();
async function genOrderData() {
  const maxRetries = 10;
  for (let i = start_id; i < start_id + number; i++) {
    try {
      (function (j) {
        setTimeout(async function () {
          const user_id = Math.floor(Math.random() * 6) + 1;
          const subtotal = Math.floor(Math.random() * 200000) + 1;
          const freight = 60;
          const total = subtotal + freight;
          const order_id = await newOrder(
            user_id,
            "unpaid",
            "credit_card",
            subtotal,
            freight,
            total,
            i
          );
          console.log(order_id);
        }, 10 * j);
      })(i);
    } catch (err) {
      if (err.message.includes("Deadlock")) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => {
            const order_id = newOrder(
              user_id,
              shipping.UNPAID,
              payment.CREDIT_CARD,
              subtotal,
              freight,
              total,
              i
            );
          }, 10);
          console.log(order_id);
        } else {
          console.log("Maximun retry attemps reached");
        }
      } else {
        console.log(err);
      }
    }
  }
}
genOrderData();
console.log("end");
