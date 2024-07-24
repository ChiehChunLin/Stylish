const router = require("express").Router();
const moment = require("moment");
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Specify the destination folder for uploaded files
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("File is not an image"));
  }
};
const maxSize = 5 * 1024 * 1024; // 5 MB
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxSize,
  },
});
const { newProduct } = require("../db/product-model");
const { getProductTitleList, newCampaign } = require("../db/marketing-model");
const { getImageCDN, getImageS3, putImageS3 } = require("../controller/s3");
const { getTimeID, getCryptoID } = require("../db/initDataId");

const expire_date = moment().add(10, "days").format("YYYY-MM-DD");
const cdnURL = process.env.AWS_CDN_URL;
//---------------------------------
//------      Routes --------------
//---------------------------------
router.get("/s3Url", async (req, res) => {
  const key = "AKIAU6GD3HUQBSVWPUGK";
  const imgUrl = getImageCDN(key);
  res.render("imageDisplay", { shoppingCount: 0, imgUrl });
});

router.post(
  "/campaignS3",
  upload.fields([{ name: "image", maxCount: 1 }]),
  async (req, res) => {
    try {
      const prefix = "campaign";
      const fileKeys = await uploadFileToS3(prefix, req.files["image"]);

      const { title, product, start, expire, story } = req.body;
      const data = {
        title,
        product,
        image: fileKeys[0],
        story,
        start,
        expire,
      };

      const campaign = await newCampaign(data);
      const redisKey = "campaign";
      await deleteRedis(redisKey);
      // console.log("new campaign:" + JSON.stringify(campaign));
      const message = campaign
        ? "new campaign is generated successfully!"
        : "new campaign is generated fail!";

      res.status(200).send({ campaign, message });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  }
);
router.post(
  "/productS3",
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "otherImages[]", maxCount: 10 }, // Change maxCount as per your requirement
  ]),
  async (req, res) => {
    try {
      const product_id = getTimeID();
      const mainImageKeys = await uploadFileToS3(
        product_id,
        req.files["mainImage"]
      );
      const otherImagesKeys = await uploadFileToS3(
        product_id,
        req.files["otherImages[]"]
      );

      const {
        title,
        price,
        category,
        description,
        story,
        texture,
        wash,
        place,
        note,
        sizes,
        stocks,
        color_codes,
        color_names,
      } = req.body;
      const variants = [];
      for (let i = 0; i < sizes.length; i++) {
        const variant = {
          size: sizes[i],
          stock: stocks[i],
          color_code: color_codes[i],
          color_name: color_names[i],
        };
        variants.push(variant);
      }
      const data = {
        title,
        price,
        category,
        description,
        story,
        texture,
        wash,
        place,
        note,
        variants,
        main_image: mainImageKeys[0],
        images: otherImagesKeys,
      };
      const product = await newProduct(data, product_id);
      // console.log("new product:" + JSON.stringify(product));
      const message = product
        ? "new product is generated successfully!"
        : "new product is generated fail!";

      res.status(200).send({ product, message });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  }
);
router.post(
  "/newCampaign",
  upload.fields([{ name: "image", maxCount: 1 }]),
  async (req, res) => {
    try {
      console.log(req.body);
      let image = "";
      if (req.files["image"] != undefined) {
        image = req.files["image"][0].path;
        // console.log(image);
      } else {
        throw new Error("no image files included.");
      }
      const { title, product, story } = req.body;
      const data = {
        title,
        product,
        image,
        story,
      };
      console.log(data);
      const campaign = await newCampaign(data);
      const redisKey = "campaign";
      await deleteRedis(redisKey);
      // console.log("new campaign:" + JSON.stringify(campaign));
      const message = campaign
        ? "new campaign is generated successfully!"
        : "new campaign is generated fail!";

      res.status(200).send({ campaign, message });
    } catch (err) {
      console.log(err);
      res.status(500).send(err);
    }
  }
);

router.get("/campaign_list", async (req, res) => {
  try {
    const campaigns = await getCampaignTitleList();
    res.status(200).send({ campaigns });
  } catch (err) {
    res.status(500).send(err);
  }
});
router.get("/product_list", async (req, res) => {
  try {
    const products = await getProductTitleList();
    res.status(200).send({ products });
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;

//=================================
//        Function
//=================================
async function uploadFileToS3(prefix, files) {
  if (files == undefined) return [""];

  const filesResult = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    file.filename = `${prefix}-${index}-${file.filename}`;
    try {
      const awsResult = await putImageS3(file);
      if (awsResult.$metadata.httpStatusCode !== 200) {
        throw new Error("image upload to S3 failed!");
      }
      filesResult.push(file.filename);
    } catch (error) {
      // Handle error if needed
      console.error(error);
    }
  }
  return filesResult;
}
