const router = require("express").Router();
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const dotenv = require("dotenv");
dotenv.config();
const { getShoppingCount } = require("../db/order-model");
const { newUser, getUserByEmail } = require("../db/user-model");
const { authJwtSign, authJwtCheckNext } = require("../middleware/authenticate");
const { removeUserAndShoppingRecord } = require("../middleware/checkCache");
const authProvider = {
  NATIVE: "native",
  FACEBOOK: "facebook",
};
const authRole = {
  USER: "user",
  ADMIN: "admin",
};
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

//---------------------------------
//------      Routes --------------
//---------------------------------
router.get("/signin", authJwtCheckNext, async (req, res) => {
  const { user } = req;
  let shoppingCount = 0;
  if (user && user.shoppingList) {
    shoppingCount = user.shoppingList.length;
  }
  const message = req.flash("message");
  res.render("signin", { user: undefined, message, shoppingCount });
});

router.get("/signup", (req, res) => {
  const { user } = req;
  let shoppingCount = 0;
  if (user && user.shoppingList) {
    shoppingCount = user.shoppingList.length;
  }
  const message = req.flash("message");
  res.render("signup", { user: undefined, message, shoppingCount });
});

router.post("/signin", async (req, res) => {
  try {
    const { provider } = req.body;
    switch (provider) {
      case authProvider.NATIVE:
        const { email, password } = req.body;
        const user = await getUserByEmail(email);
        if (!user) {
          const message = "User account doesn't exit!";
          return res.status(403).send({ message });
        }
        const match = await bcrypt.compare(password, user.password);
        if (match) {
          const message = "Login Successfully!";
          const { access_token, access_expired } = authJwtSign(user);
          req.session.accessToken = access_token;
          res.cookie("accessToken", access_token);
          req.session.cookie.maxAge = access_expired * 1000;
          const shoppingCount = await getShoppingCount(user.id);
          return res
            .status(200)
            .send({
              access_token,
              access_expired,
              user,
              message,
              shoppingCount,
            });
        } else {
          const message = "Wrong email or password!";
          return res.status(403).send({ message });
        }
      case authProvider.FACEBOOK:
        const { accessToken, userID } = req.body;
        try {
          // Validate access token
          const { data } = await axios.get(
            `https://graph.facebook.com/debug_token`,
            {
              params: {
                input_token: accessToken,
                access_token: `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`,
              },
            }
          );
          if (data.data.is_valid) {
            const userId = data.data.user_id;
            const userInfoResponse = await axios.get(
              `https://graph.facebook.com/${userID}`,
              {
                params: {
                  fields: "name,email,picture",
                  access_token: accessToken,
                },
              }
            );
            const { name, email, picture } = userInfoResponse.data;
            let user = await getUserByEmail(email);
            if (!user) {
              //should save userID from third-party
              user = await newUser(
                provider,
                authRole.USER,
                name,
                email,
                "",
                picture.data.url
              );
            }
            console.log(`${user.name} register successfully`);
            const { access_token, access_expired } = authJwtSign(user);
            const shoppingCount = await getShoppingCount(user.id);
            return res
              .status(200)
              .send({ access_token, access_expired, user, shoppingCount });
          } else {
            return res.status(401).send({ message: "Invalid access token" });
          }
        } catch (err) {
          return res.status(500).send({ message: `Server error ${err}` });
        }
      default:
        const message = "Signin Provider Error!";
        return res.status(403).send({ message });
    }
  } catch (err) {
    return res.status(500).send(err);
  }
});

//註冊完直接登入
router.post("/signup", async (req, res, next) => {
  const { provider } = req.body;
  switch (provider) {
    case authProvider.NATIVE:
      const { name, email, password } = req.body;
      const messagePW = verificationOfPassword(password);
      if (messagePW != undefined) {
        req.flash("message", messagePW);
        return res.status(403).send(messagePW);
      }
      const messageEmail = verificationOfEmail(email);
      if (messageEmail != undefined) {
        req.flash("message", messageEmail);
        return res.status(400).send(messageEmail);
      }
      try {
        const user = await getUserByEmail(email);
        if (user != undefined) {
          console.log("signup user duplicated:" + JSON.stringify(user));
          const message = "Email has already been registered.";
          return res.status(403).send({ message });
        } else {
          const passwordHash = await bcrypt.hash(password, saltRounds); //length:60
          const user = await newUser(
            provider,
            authRole.USER,
            name,
            email,
            passwordHash
          );
          const { access_token, access_expired } = authJwtSign(user);
          req.session.accessToken = access_token;
          res.cookie("accessToken", access_token);
          req.session.cookie.maxAge = access_expired * 1000;
          const shoppingCount = await getShoppingCount(user.id);
          console.log(`${name} register successfully`);
          return res
            .status(200)
            .send({ access_token, access_expired, user, shoppingCount });
        }
      } catch (err) {
        return res.status(500).send({ message: err.message });
      }
    default:
      return res.status(403).send({ message: "Signup Provider Error!" });
  }
});

router.get(
  "/signout",
  authJwtCheckNext,
  removeUserAndShoppingRecord,
  (req, res) => {
    res.clearCookie("accessToken");
    const message = "Logout successfully!";
    return res.status(200).send({ message });
  }
);
router.get("/profile", (req, res) => {
  try {
    const data = req.user;
    // res.redirect("profile", { user: data });
    res.send({ data });
  } catch (err) {
    res.status(500).send(err);
  }
});

//---------------------------------
//------      Functions -----------
//---------------------------------
function verificationOfPassword(password) {
  //Check Complexity Of Password
  if (password.length < 8) {
    return "password should be at least 8 characters.";
  }
  // else if (!/[A-Z]/.test(password)) {
  //   return "password should be at least one UpperCase";
  // }
  else if (!/[a-z]/.test(password)) {
    return "password should be at least one LowerCase";
  } else if (!/\d/.test(password)) {
    return "password should be at least one Number";
  } else {
    return undefined;
  }
  // } else if (!/\W/.test(password)) {
  //   return "password should be at least non-alphas"; //特殊符號
  // }
}
function verificationOfEmail(email) {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailPattern.test(email)) {
    return "email without domain address.";
  } else {
    return undefined;
  }
}

module.exports = router;
