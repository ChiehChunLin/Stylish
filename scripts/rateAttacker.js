const https = require("https");
const axios = require("axios");
// const url = "http://localhost:3000";
const url = "https://13.236.104.136/api/1.0/marketing/campaigns";

const instance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

async function fetchData(url) {
  try {
    const res = await instance.get(url);
    const { data } = res;
    if(data){
      console.log("attack!");
    }    
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}
// fetchData(url);

let counter = 0;
const interval = setInterval(()=>{
    fetchData(url);
    counter++;
    if(counter === 1000){
        clearInterval(interval);
    }
},600); //60000ms /10