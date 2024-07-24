const Redis = require('ioredis');
const dotenv = require("dotenv");
dotenv.config();
const redis = new Redis({
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times % 4 ==0) { 
        console.error('Redis error: reconnect exhausted after 3 retries.');
        return null;
      }
      return 200;
    }
  });


async function listenForMessages(queue, timeout = 0) {
        try {
            const message = await redis.blpop(queue, timeout); //unit: seconds
            if (message) {
                const [key, dataStr] = message;
                const data = JSON.parse(dataStr);
                console.log(`Received message from queue : length ${data.length}!`);
        
                const userTotal = [];
                data.forEach((d) => {
                    let user = userTotal.find(x => x.user_id === d.user_id);
                    if( user == undefined) {
                        const newer ={};
                        newer.user_id = d.user_id;
                        newer.total_payment = d.total;
                        userTotal.push(newer);
                    }else{
                        user.total_payment += d.total;
                    }
                });
                console.log(userTotal);
            } else {
                console.log('No message received within the timeout.');
            }
        } catch (error) {
            console.error(error);
        }
  }
  
let counter = 0;
const redisList = "paylist";
const interval = setInterval(()=>{
    listenForMessages(redisList, 0);
    counter++;
    if(counter === 1000){
        clearInterval(interval);
    }
},2000); //60000ms /10
  