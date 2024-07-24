const Redis = require("ioredis");
const redis = new Redis({
  // host: process.env.AWS_CACHE_PRIMARY,
  // port: process.env.AWS_CACHE_PORT,
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    if (times % 4 == 0) {
      console.error("Redis error: reconnect exhausted after 3 retries.");
      return null;
    }
    return 200;
  },
});

//https://github.com/redis/ioredis/blob/main/examples/

async function setRedis(key, value, expire = 0) {
  try {
    if (expire === 0) {
      await redis.set(key, JSON.stringify(value));
    } else {
      //expire unit : seconds
      await redis.set(key, JSON.stringify(value), "EX", expire);
    }
  } catch (err) {
    console.log("Redis error:" + err);
  }
}

async function getRedis(key) {
  try {
    return JSON.parse(await redis.get(key));
  } catch (err) {
    console.log("redis error:" + err);
  }
}

async function deleteRedis(key) {
  try {
    await redis.del(key);
  } catch (err) {
    console.log("redis error:" + err);
  }
}
async function deleteAllRedis() {
  var stream = redis.scanStream({
    match: "sample_pattern:*",
  });
  stream.on("data", function (keys) {
    // `keys` is an array of strings representing key names
    if (keys.length) {
      var pipeline = redis.pipeline();
      keys.forEach(function (key) {
        pipeline.del(key);
      });
      pipeline.exec();
    }
  });
  stream.on("end", function () {
    console.log("done");
  });
}

async function hmsetRedis(set, data) {
  try {
    // hmset('key', { k1: 'v1', k2: 'v2' })
    await redis.hmset(set, data);
  } catch (err) {
    console.log("redis error:" + err);
  }
} //initail list
async function hmgetRedis(set, data) {
  try {
    // hmset('key', { k1: 'v1', k2: 'v2' })
    await redis.hmget(set, data);
  } catch (err) {
    console.log("redis error:" + err);
  }
} //initail list
async function hsetRedis(set, value) {
  try {
    await redis.hset(set, value);
  } catch (err) {
    console.log("redis error:" + err);
  }
} //addShoppingCart
async function hdelRedis() {
  try {
    await redis.hdel(set, user);
  } catch (err) {
    console.log("redis error:" + err);
  }
} //deleteShoppingCart
async function hkeysRedis(set) {
  try {
    await redis.hkeys(set);
  } catch (err) {
    console.log("redis error:" + err);
  }
} // list variants
async function hvalsRedis(set) {
  try {
    await redis.hvals(set);
  } catch (err) {
    console.log("redis error:" + err);
  }
} // list qty
async function hlenRedis(set) {
  try {
    await redis.hlen(set);
  } catch (err) {
    console.log("redis error:" + err);
  }
} // fields count
async function hgetallRedis(set) {
  try {
    await redis.hgetall(set);
  } catch (err) {
    console.log("redis error:" + err);
  }
} // list variant+qty

async function rpushRedis(queue, data) {
  try {
    const message = JSON.stringify(data);
    await redis.rpush(queue, message);
    console.log(`Message is pushed to queue '${queue}'.`);
  } catch (err) {
    console.log("redis error:" + err);
  }
}
async function lpopRedis(queue) {
  try {
    return await JSON.parse(redis.lpop(queue));
  } catch (err) {
    console.log("redis error:" + err);
  }
}

module.exports = {
  setRedis,
  getRedis,
  deleteRedis,
  deleteAllRedis,
  hmsetRedis,
  hmgetRedis,
  hsetRedis,
  hdelRedis,
  hkeysRedis,
  hvalsRedis,
  hlenRedis,
  hgetallRedis,
  rpushRedis,
  lpopRedis,
};
