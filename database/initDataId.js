const moment = require("moment");
const crypto = require("crypto");
const { promisify } = require("util");
const randomBytes = promisify(crypto.randomBytes);

function getTimeID() {
  return Number(
    new Date().toLocaleString("af-ZA", { hour12: false }).replace(/-| |:|/g, "")
  );
}
async function getCryptoID() {
  const rawBytes = await randomBytes(16);
  return rawBytes.toString("hex");
}

module.exports = {
  getTimeID,
  getCryptoID,
};
