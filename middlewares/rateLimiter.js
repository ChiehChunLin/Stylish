const moment = require("moment"); 
let attackers = [];

async function rateProtector(req, res, next) {
    const newer ={};
    const ip = 
    req.headers["cf-connecting-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress || "";
    //attack ip: ::ffff:127.0.0.1
    let attacker = attackers.find(x => x.ip === ip);
    if( attacker == undefined) {
        newer.ip = ip;
        newer.count = 1;
        newer.starttime = moment().format('YYYY-MM-DDTHH:mm:ss.SSS'); // Timestamp format
        newer.expire = moment().add(moment.duration(60,'seconds'));
        attacker = newer;
        attackers.push(newer);
    }else{
        attacker.count++;
        if(attacker.expire < moment() || attacker.count > 10){
            attackers = attackers.filter( a => a.ip !== ip );
            // console.log(`${ip} attack record clear!`);            
        }
        if(attacker.expire > moment() && attacker.count > 100){
            //Error 429: Too Many Requests
            return res.status(429).send({ message: `${ip} attacks! 10 times in a minute!`});
        } 
    }
    // console.log(`attack ip: ${attacker.ip} ${attacker.count}`);
    next();
  }

  module.exports = {
    rateProtector
  };