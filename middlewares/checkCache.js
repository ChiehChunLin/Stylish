const moment = require("moment");
const {
  setRedis,
  getRedis,
  deleteRedis,
  deleteAllRedis,
} = require("../db/redis-cache");
const { getAllCampaigns } = require("../db/marketing-model");
const { getUser } = require("../db/user-model");
const { getShoppingList } = require("../db/order-model");

const campaignKey = "campaign";
const userKey = "userInfo";

function defineExpireTime(data) {
  const expires = data.map((d) => {
    const timeString = JSON.stringify(d.expire).replace('"', "");
    t = timeString.split(/[- : T Z .]/);
    const result = new Date(
      t[0],
      t[1] - 1,
      t[2],
      t[3] || 0,
      t[4] || 0,
      t[5] || 0
    );
    const now = new Date();
    const seconds = parseInt((result - now) / 1000);
    return seconds;
  });
  return Math.min(...expires);
  //convert to seconds and set into redis
  //use closest expire time to clean redis
}
async function cacheCampaign(req, res, next) {
  try {
    const cache = await getRedis(campaignKey);
    if (cache) {
      req.campaigns = cache;
      console.log(`get ${campaignKey} cache!`);
      next();
    } else {
      const data = await getAllCampaigns();
      if (data) {
        const expire = defineExpireTime(data);
        setRedis(campaignKey, data, expire);
        console.log(`get ${campaignKey} db!`);
      }
      req.campaigns = data;
      next();
    }
  } catch (err) {
    return res.status(500).send(err);
  }
}
async function cacheUserAndShoppingRecord(req, res, next) {
  const { user } = req;
  // console.log("cache user!:" + JSON.stringify(user));
  try {
    if (user) {
      const cacheUser = await getRedis(user.id); // null
      if (cacheUser) {
        req.user = cacheUser;
        console.log(`get ${userKey} cache!`);
      } else {
        const userInfo = await getUser(user.id);
        const shoppingList = await getShoppingList(user.id);
        const userShopList = [];
        shoppingList.forEach((product) => {
          for (let i = 0; i < product.qty; i++) {
            const userShopData = {};
            userShopData.product_id = product.product_id;
            userShopData.product_color = product.product_color;
            userShopData.product_size = product.product_size;
            userShopList.push(userShopData);
          }
        });
        userInfo.shoppingList = userShopList;
        await setRedis(user.id, userInfo);
        req.user = userInfo;
        console.log(`get ${userKey} db!`);
      }
      // console.log("req.user: %j", req.user);
    }
    next();
  } catch (err) {
    return res.status(500).send(err);
  }
}
async function removeUserAndShoppingRecord(req, res, next) {
  const { user } = req;
  try {
    if (user) {
      const cacheUser = await getRedis(user.id);
      if (cacheUser) {
        // await deleteRedis(user.id);
        await deleteAllRedis();
        req.user = null;
        console.log(`${userKey} record removed!`);
      }
    }
    console.log("remove: " + user);
    next();
  } catch (err) {
    return res.status(500).send(err);
  }
}

module.exports = {
  cacheCampaign,
  cacheUserAndShoppingRecord,
  removeUserAndShoppingRecord,
};
