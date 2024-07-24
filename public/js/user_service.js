//-------------------------------------
//------   DOM Event Handler ----------
//--------------------------------------
// document.addEventListener("DOMContentLoaded", function () {
//   $(document).ready(function () {});
// });

//-------------------------------------
//------       Functions     ----------
//--------------------------------------
const authProvider = {
  NATIVE: "native",
  FACEBOOK: "facebook",
};
// <!-- Add the Facebook SDK for Javascript -->
function statusChangeCallback(url, response) {
  // Called with the results from FB.getLoginStatus().
  if (response.status === "connected") {
    if (response.authResponse) {
      const { accessToken, userID } = response.authResponse;
      const provider = authProvider.FACEBOOK;
      const config = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider, accessToken, userID }),
      };
      console.log("statusChangeCallback");
      loginFetch(url, config);
    } else {
      //Authentication is expired or limited
    }
  } else {
    //response.status is unknown or non-authenticated
  }
}
function checkLoginState() {
  FB.getLoginStatus(function (response) {
    statusChangeCallback(response);
  });
}
window.fbAsyncInit = function () {
  if(window.location.protocol == "http:")
    return;
  
  //FB only working under https
  FB.init({
    appId: "408123525319312",
    cookie: true, // Enable cookies to allow the server to access the session.
    xfbml: true, // Parse social plugins on this webpage.
    version: "v19.0", // Use this Graph API version for this call.
  });

  FB.getLoginStatus(function (response) {
    if (response.status === "connected") {
      console.log("Welcome!  Fetching your information.... ");
      FB.api("/me", function (response) {
        console.log("Facebook Successful login for: " + response.name);
      });
    } else {
      // Not logged into your webpage or we are unable to tell.
      console.log("fb response status: " + response.status);
    }
  });
};

$("#facebookSignin").click(function (e) {
  e.preventDefault();
  console.log("facebookSignin click");
  FB.login(
    function (response) {
      const url = "/api/1.0/user/signin";
      statusChangeCallback(url, response);
    },
    { scope: "public_profile,email" }
  );
});
$("#facebookSignup").click(function (e) {
  e.preventDefault();
  console.log("facebookSignup click");
  FB.login(
    function (response) {
      const url = "/api/1.0/user/signin";
      statusChangeCallback(url, response);
    },
    { scope: "public_profile,email" }
  );
});
$("#loginForm").submit(function (e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const provider = authProvider.NATIVE;
  const name = undefined;
  const email = formData.get("email");
  const password = formData.get("password");

  const config = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ provider, name, email, password }),
  };
  loginFetch("/api/1.0/user/signin", config);
});
$("#signupForm").submit(function (e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const provider = authProvider.NATIVE;
  const name = formData.get("name");
  const email = formData.get("email");
  const password = formData.get("password");
  console.log(provider);
  //用function 包起來會出現，TypeError: NetworkError when attempting to fetch resource.
  // signinFetch("/user/signup", provider, email, password);
  const config = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ provider, name, email, password }),
  };
  loginFetch("/api/1.0/user/signup", config);
});
$("#logoutBtn").click(function (e) {
  e.preventDefault();
  console.log("click logout");
  const config ={
    method:"GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      "Cache-Control": "no-cache", // without this config, the page return "304 Not Modified"
    },
  }
  logoutFetch("/api/1.0/user/signout", config);
  localStorage.removeItem("accessToken");
  if(window.location.protocol == "https:"){
    FB.getLoginStatus(function (response) {
      if (response.status === "connected") {
        FB.logout(function (response) {
          console.log("fb logout status changes to: " + response.status);
        });
      }
    });
  }
  displayTempMessage("Signout Successfully!");
});

function loginFetch(url, config) {
  fetch(url, config)
    .then(checkStatus)
    .then(checkResponse)
    .then((data) => {
      if (data) {
        const { access_token, access_expired, user, shoppingCount, message } = data;
        // console.log("data:" + JSON.stringify(user));

        if (access_token && user) {
          localStorage.setItem("accessToken", access_token);
          displayLoginUserInfo(user.name, user.email, user.picture);
          displayShoppingCount(shoppingCount);
          displayTempMessage("Login Successfully.");
        } else {
          if (message) {
            displayTempMessage(message);
          }
          console.error("Login failed:", data);
          throw new Error("Something went wrong with login authentication");
        }
      }
    })
    .catch((err) => {
      displayTempMessage(err);
      console.error("fetch error:", err);
    });
}
function logoutFetch(url, config ="") {
  fetch(url, config)
    .then(checkStatus)
    .then(checkResponse)
    .then((data) => {
      if (data) {        
        const { message } = data;        
        if (message) {          
          displayTempMessage(message);
        }
      }
    })
    .catch((err) => {
      displayTempMessage(err);
      console.error("fetch error:", err);
    });
}

function displayLoginUserInfo(name, email, picture) {
  // return authFetch("/user/profile", "GET"); //authToken 無法送到/user/profile
  // window.location = "/user/profile"; // should send req with auth
  // const html = ejs.render("profile", { user }); //ejs is not defined
  // console.log("display user: " + picture);
  const containerDiv = document.querySelector(".main-content");
  containerDiv.innerHTML = `
          <h3>Welcome!</h3>
          </br>
          <h4>${name}</h4> 
          <h4>${email}</h4>         
        `;
  // <img src="${picture}" alt="headshot">  無法顯示照片
}
function displayShoppingCount(count){
  const countDiv = document.querySelector(".counter");
  countDiv.textContent = count;
}