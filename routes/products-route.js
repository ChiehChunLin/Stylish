const router = require("express").Router();
const { getImageCDN } = require("../controller/s3");
const {
  getProductRowsCountCategory,
  getProductRowsCountSearch,
  getProductById,
  getWindowDataByCategory,
  getWindowDataBySearch,
} = require("../db/product-model");
const { authJwtCheckNext } = require("../middleware/authenticate");
const {
  cacheCampaign,
  cacheUserAndShoppingRecord,
} = require("../middleware/checkCache");
const productCategory = {
  MEN: "Men",
  WOMEN: "Women",
  ACCESSORIES: "Accessories",
};
const pageSize = 6; // 6 products displayed per page.

router.get("/search", async (req, res) => {
  const { campaigns, user } = req;
  const { keyword, paging } = req.query;
  const page = paging ? Number(paging) : 0;
  try {
    let shoppingCount = 0;
    if (user && user.shoppingList) {
      shoppingCount = user.shoppingList.length;
    }

    const count = await getProductRowsCountSearch(`%${keyword}%`);
    const totalPage =
      count % pageSize == 0
        ? Math.floor(count / pageSize)
        : Math.floor(count / pageSize) + 1;
    console.log(`${count} / ${totalPage} / ${pageSize}`);
    const products = await getWindowDataBySearch(
      `%${keyword}%`,
      page * 6,
      pageSize
    );
    const productData = {
      category: undefined,
      keyword: keyword,
      currentPage: page,
      totalPage: totalPage,
      productList: products,
    };
    res.status(200).render("home", { campaigns, productData, shoppingCount });
    //page start from 0
    // if (page < totalPage - 1) {
    //   res.status(200).send({ data: extractData, next_paging: page + 1 });
    // } else {
    //   res.status(200).send({ data: extractData });
    // }
  } catch (err) {
    res.status(400).send(err);
  }
});
router.get("/details", async (req, res) => {
  const { user } = req;
  const { id } = req.query;
  try {
    let shoppingCount = 0;
    if (user && user.shoppingList) {
      shoppingCount = user.shoppingList.length;
    }

    const product = await getProductById(id);

    res.status(200).render("product", { product, shoppingCount });
    // res.status(200).send({ data });
  } catch (err) {
    res.status(400).send(`Details Error: ${err}`);
  }
});
router.get("/:category", async (req, res) => {
  const { campaigns, user } = req;
  const { category } = req.params;
  const { paging } = req.query;
  const page = paging ? Number(paging) : 0;
  try {
    let shoppingCount = 0;
    if (user && user.shoppingList) {
      shoppingCount = user.shoppingList.length;
    }

    const count = await getProductRowsCountCategory(category);
    const totalPage =
      count % pageSize == 0
        ? Math.floor(count / pageSize)
        : Math.floor(count / pageSize) + 1;
    console.log(`${count} / ${totalPage} / ${pageSize}`);
    const data = await getWindowDataByCategory(category, page * 6, pageSize);
    const productData = {
      category: category,
      keyword: undefined,
      currentPage: page,
      totalPage: totalPage,
      productList: data,
    };
    res.status(200).render("home", { campaigns, productData, shoppingCount });
    //page start from 0
    // if (page < totalPage - 1) {
    //   res.status(200).send({ data: extractData, next_paging: page + 1 });
    // } else {
    //   res.status(200).send({ data: extractData });
    // }
  } catch (err) {
    console.error("Error querying database: " + err.stack);
    res.status(400).send(`Category Error: ${err}`);
  }
});
module.exports = router;
