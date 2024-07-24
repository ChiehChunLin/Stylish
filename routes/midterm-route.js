const router = require("express").Router();
const midDB =require("../db/midterm-model");
const api = "http://35.75.145.100:1234/api/1.0/order/data";


router.get("/fetchAPI", async (req, res) => {
    const { user } = req;
    try {
        fetch(api)
        .then(checkStatus)
        .then(checkResponse)
        .then((data) => {
          if (data) {
            console.log(data.length);
            data.forEach((order,index)=> {
                const result = insertDB(user.id, index+1, order);               
            })
            res.status(200).send(data);
          }
        })
        .catch((err) => {
          console.error("fetch error:", err);
        });
    } catch (err) {
      res.status(500).send(err);
    }
});
router.get("/piePlot", async (req,res)=> {
    const { user } = req;
    try {
    const soldQuantity = await midDB.getSoldQuantity(user.id);
    const distinctColor = await midDB.getDistinctColor(user.id);
    // console.log(soldQuantity);
    // console.log(distinctColor);
    const values =[];
    const labels=[];
    const color_codes=[];
    for(let i=0 ; i<distinctColor.length;i++){
        const colorData = await midDB.getColorCount(user.id, distinctColor[i].product_color);
        values.push(Math.round(colorData.qty/soldQuantity*100));
        labels.push(colorData.color.name);
        color_codes.push(colorData.color.code);
    }
    res.status(200).send({ values, labels, color_codes });
} catch (err) {
    res.status(500).send(err);
  }
})
router.get("/histgram",async (req,res)=>{
    const { user } = req;
    try{
        const priceList = await midDB.getPriceList(user.id);
        const prices = priceList.map((item) => item.price);
        res.status(200).send({ prices });
    }catch(err){
        res.status(500).send(err);
    }
})
router.get("/barChart",async (req,res)=>{
    const { user } = req;
    try{
        let products = [];
        const productList = await midDB.getSoldProductIDs(user.id);
        //count
        for(let i=0; i<productList.length;i++){
            const newer={};
            // let product = products.find(x => x[productList[i].product_id]);
            let product = products.find(x => x.id ==productList[i].product_id);
            if( product == undefined) {
                // newer[productList[i].product_id] = 1;
                newer.id=productList[i].product_id;
                newer.count = 1;
                product = newer;
                products.push(product);
            }else{
                // product[productList[i].product_id]++;
                product.count++;
            }            
        }
        console.log(products);
        //sorted
        const sortCountTop5 = products.map(p=>{ return p.count}).sort().slice(-5);        
        const top5ProductId =[];
        for(let j=0; j< sortCountTop5.length;j++){
            const item = products.find(p => p.count === sortCountTop5[j]);
            top5ProductId.unshift(item);
        }
        console.log(top5ProductId);
        const S =[];
        const M =[];
        const L =[];
        const title=[];
        for(let k =0; k<top5ProductId.length;k++){
            const sizeCount = await midDB.getProductSize(user.id, top5ProductId[k].id);
            S.push(sizeCount.S);
            M.push(sizeCount.M);
            L.push(sizeCount.L);
            title.push(sizeCount.title)
        }
        console.log(S);
        console.log(title);     

        res.status(200).send({title, S, M, L});
    }catch(err){
        res.status(500).send(err);
    }
})
router.get("/dashboard", async (req,res)=>{
  const { user } = req;
  try {
    let shoppingCount = 0;
    if (user && user.shoppingList) {
      shoppingCount = user.shoppingList.length;
    }
    //----------------------------------------------------------
    const revenue = await midDB.getSumOrders(user.id);
    //----------------------------------------------------------

    res.status(200).render("dashboard", { shoppingCount, revenue });
  } catch (err) {
    res.status(400).send(`Details Error: ${err}`);
  }
});

module.exports = router;

//---------------------------
//---------function-----------
//---------------------------
async function insertDB(user_id, index, order){
    try{
        const subtotal = order.list.reduce((partialSum, a) => partialSum + (a.price * a.qty), 0);
        const freight = order.total - subtotal;
        setTimeout(async function () {
            const order_id = await midDB.newOrder(index,7,"unpaid","credit_card",subtotal,freight, order.total);
            // console.log(order_id);
            order.list.map(async (p) => {
                const productData = genProductData(p.id, p.price);
                const variantData = genVariantData(p.color.code, p.color.name, p.size);
                const product_id = await midDB.insertProduct(p.id , productData );
                const variant_result = await midDB.insertVariant(p.id, variantData);
                for(let i=0; i< p.qty;i++){
                    const shopping_id = await midDB.addShoppingList(order_id, user_id,p.id,p.color.code,p.size);
                }
            })
          }, 30);      
        
        return true;  
    }catch(err){
        console.log("insertDB error: " + err.message);
        return false; 
    }   
}
function genVariantData( _color_code, _color_name, _size){
    const variant = {
        color_code: _color_code,
        color_name: _color_name,
        size: _size,
        stock: 20000,
      };
      return variant;
}
function genProductData(_id, _price){
   
    const _product = {
        title: "Midterm-" + _id,
        price: _price,
        category: "women",
        description: "description",
        texture: "texture",
        wash: "wash",
        place: "place",
        note: "note",
        story: "story",
        main_image: `20240522015947-0-8bac89ed98b428dd30231ce116f72ac7`,
        images: [
          "20240522015947-0-25ea6c8fa616d9ed6140593e7395e2e1",
          "20240522015947-1-6420b34207a6e90027bd9fcfbb3dc992",
          "20240522015947-2-efdf63df77a64cb6a1bd8189c81792a6",
        ],
      };
      return _product;
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
