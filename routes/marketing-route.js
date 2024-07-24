const router = require("express").Router();
const {
  newCampaign,
  getAllCampaigns,
  getProductTitleList,
  getCampaignTitleList,
  getHotsData,
} = require("../db/marketing-model");
const { cacheCampaign } = require("../middleware/checkCache");

//======================================
router.get("/campaigns", async (req, res) => {
  const { campaigns } = req;
  try {
    if (campaigns) {
      res.status(200).send(campaigns);
    } else {
      throw new Error("No campaigns data in db or cache");
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

router.get("/hots", async (req, res) => {
  try {
    const data = await getHotsData();
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

module.exports = router;
