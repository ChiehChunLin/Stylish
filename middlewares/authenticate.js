const jwt = require("jsonwebtoken");
const authRole = {
  USER: "user",
  ADMIN: "admin",
};
//----------------------------------------------------------------
//----------------          Functions          -------------------
//----------------------------------------------------------------
function getToken(req) {
  const authToken = req.headers["authorization"]; //"Bear " + token
  let token = undefined;
  if (authToken) {
    token = authToken.split(" ")[1];
  } else {
    // token = req.session.accessToken;
    token = req.cookies.accessToken;
  }
  // console.log("token:" + token);
  return token;
}
async function authJwtCheckNext(req, res, next) {
  const token = getToken(req);
  if (token) {
    jwt.verify(token, process.env.PASSPORT_SECRET, (err, user) => {
      if (err) {
        return res
          .status(403)
          .json({ message: `User Authentication Error! ${err}` });
        //the token with no authentication
        // or could be JWT TokenExpiredError
      }
      req.user = user;
    });
  }
  next();
}
async function authJwtCheckLogin(req, res, next) {
  const token = getToken(req);
  // Unauthorized
  if (!token) {
    return res
      .status(401)
      .redirect(`/api/${process.env.API_VERSION}/user/signin`);
  }
  jwt.verify(token, process.env.PASSPORT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: `User Authentication Error! ${err}` });
      //the token with no authentication
      // or could be JWT TokenExpiredError
    }
    req.user = user;
    next();
  });
}
async function authAdminCheck(req, res, next) {
  const { user } = req;
  if (!user || user.role != authRole.ADMIN) {
    return res
      .status(403)
      .json({ message: "User Authentication Error! The page for admin only!" });
  }
  next();
}
function authJwtSign(user) {
  const tokenObject = { id: user.id };
  const access_expired = 24 * 60 * 60;
  const access_token = jwt.sign(tokenObject, process.env.PASSPORT_SECRET, {
    expiresIn: access_expired,
  });
  // jwt.sign with default (HMAC SHA256)
  // jwt.sign expiresIn default unit in number is second, but default unit in string is ms.
  const auth = { access_token, access_expired };
  return auth;
}
module.exports = {
  authJwtCheckNext,
  authJwtCheckLogin,
  authAdminCheck,
  authJwtSign,
};
