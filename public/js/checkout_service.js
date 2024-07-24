//================================================
//==  Deliver Section Changed for Freight Price ==
//================================================
const countrySelect = document.getElementById("inputReceiveCountry");
if(countrySelect){
  countrySelect.addEventListener("change", function(){
    const selectedValue = countrySelect.value;
    let freightFee = 0;
    switch(selectedValue){
      case "TW":
        freightFee=60;
        break;
      case "TW_Islands":
        freightFee=100;
        break;
      case "HK":
        freightFee=150;
        break;
      case "SG":
        freightFee=250;
        break; 
      case "MY":
        freightFee=200;
        break;
    }
    // Fetch freight price based on selected country value
    // Should I set on server side?
    // fetch('/getFreightPrice?country=' + selectedValue)
    //     .then(response => response.json())
    //     .then(data => {
    //         freightPrice.textContent = "$" + data.price;
    //     });
    const freightPrice = document.getElementById("freightPrice");
    const subtotalPrice = document.getElementById("subtotalPrice");
    const totalPrice = document.getElementById("totalPrice");
    freightPrice.textContent = "$" + freightFee;
    const subtotalValue = Number(subtotalPrice.innerText.substring(1));
    totalPrice.textContent = "$" + (subtotalValue + freightFee);
  });
}

//==========================
//==  Pay Method Changed  ==
//==========================
const paymentMethod = document.getElementById("payMethodForm");
if(paymentMethod){
  paymentMethod.addEventListener("change", function(e) {
    const method = e.target.id;
    console.log("Selected option:", method);
    if(method == "payCreditCard") 
      { 
        $("#payFormGroup").show();
      } else {
        $("#payFormGroup").hide();
      }
  });
}

//==========================
//==   Checkout Process   ==
//==========================
const TAPPAY_APPID = 12348;
const TAPPAY_KEY =
  "app_pa1pQcKoY22IlnSXq5m5WP5jFKzoRG58VEXpT7wU62ud7mMbDOGzCYIlzzLF";

const checkoutBtn = document.getElementById("checkoutOrderBtn");
if(checkoutBtn){
  checkoutBtn.addEventListener("click", function(e) {
    e.preventDefault();
  
    const deliverForm = document.getElementById("deliveryForm");
    const deliverFormData = new FormData(deliverForm);
    const deliverSection = document.getElementById("inputReceiveCountry").value;
    const deliverTime = document.getElementById("inputReceiveTime").value;
    const deliverData = {};
        [...deliverFormData].forEach((item) => {
          deliverData[item[0]] = item[1];
        })
        deliverData["deliverSection"] = deliverSection;
        deliverData["deliverTime"] = deliverTime;
    // { inputReceiveName → "mama", 
    //   inputReceivePhone → "0987878878", 
    //   inputReceiveEmail → "aaa123456@fakemail.com", 
    //   address → "台北市中正區仁愛路二段99號9樓", 
    //   isSaveDeliverInfo → "true" }
  
    const payMethod = document.querySelector("input[type='radio'][name='paymentMethod']:checked").value;
    // credit_card or cash_on_delivery
  
    const payForm = document.getElementById("payForm");
    const payFormData = new FormData(payForm);
    //isSavePayInfo → "true"
  
    // const cardNumber = document.getElementById("cc_number").innerText;
    // const cardExpire = document.getElementById("cc_exp").innerText;
    // const cardCCV = document.getElementById("cc_ccv").innerText;
    // console.log(cardNumber);
    // console.log(cardExpire);
    // console.log(cardCCV);
  
    const subtotalPrice = document.getElementById("subtotalPrice").textContent;
    const freightPrice = document.getElementById("freightPrice").textContent; 
    const totalPrice = document.getElementById("totalPrice").textContent;
    const checkoutCost = { subtotalPrice , freightPrice, totalPrice };
    console.log(checkoutCost);
  
    let prime = undefined;
    if(payMethod === "credit_card"){
      const tappayStatus = TPDirect.card.getTappayFieldsStatus();
      console.log("tappayStatus:" + tappayStatus);
    
      // Check TPDirect.card.getTappayFieldsStatus().canGetPrime before TPDirect.card.getPrime
      if (tappayStatus.canGetPrime === false) {
        alert("can not get prime");
        return;
      }
      // Get prime
      TPDirect.card.getPrime(function (result) {
        if (result.status !== 0) {
          alert("get prime error " + result.msg);
          return;
        }
        prime = result.card.prime;
      });
    }
    const config = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache", // without this config, the page return "304 Not Modified"
      },
      body: JSON.stringify({ prime, payMethod, checkoutCost, deliverData})
    };
    const url = "/api/1.0/order/checkout";
    console.log("payForm prime: " + prime);
    const contentDiv = document.querySelector(".checkout");
    contentDiv.innerHTML = "";
    fetchPostPrime(url, config, contentDiv);
  });
}

if(window.location.href.includes("/order/checkout")){
  TPDirect.setupSDK(TAPPAY_APPID, TAPPAY_KEY, "sandbox");

  TPDirect.card.setup({
    fields: {
      number: {
        element: ".form-control.card-number",
        placeholder: "**** **** **** ****",
      },
      expirationDate: {
        element: document.getElementById("tappay-expiration-date"),
        placeholder: "MM / YY",
      },
      ccv: {
        element: $(".form-control.ccv")[0],
        placeholder: "後三碼",
      },
    },
    styles: {
      input: {
        color: "gray",
      },
      "input.ccv": {
        // 'font-size': '16px'
      },
      ":focus": {
        color: "black",
      },
      ".valid": {
        color: "green",
      },
      ".invalid": {
        color: "red",
      },
      "@media screen and (max-width: 400px)": {
        input: {
          color: "orange",
        },
      },
    },
    // 此設定會顯示卡號輸入正確後，會顯示前六後四碼信用卡卡號
    isMaskCreditCardNumber: true,
    maskCreditCardNumberRange: {
      beginIndex: 6,
      endIndex: 11,
    },
  });

  TPDirect.card.onUpdate(function (update) {
    // onUpdate : listen for TapPay Field
  
    /* Disable / enable submit button depend on update.canGetPrime  */
    /* ============================================================ */
  
    // update.canGetPrime === true
    //     --> you can call TPDirect.card.getPrime()
    // const submitButton = document.querySelector('button[type="submit"]')
    if (update.canGetPrime) {
      // submitButton.removeAttribute('disabled')
      $('button[type="submit"]').removeAttr("disabled");
    } else {
      // submitButton.setAttribute('disabled', true)
      $('button[type="submit"]').attr("disabled", true);
    }
  
    /* Change card type display when card type change */
    /* ============================================== */
  
    // cardTypes = ['visa', 'mastercard', ...]
    var newType = update.cardType === "unknown" ? "" : update.cardType;
    $("#cardtype").text(newType);
  
    /* Change form-group style when tappay field status change */
    /* ======================================================= */
  
    // number 欄位是錯誤的
    if (update.status.number === 2) {
      setNumberFormGroupToError(".card-number-group");
    } else if (update.status.number === 0) {
      setNumberFormGroupToSuccess(".card-number-group");
    } else {
      setNumberFormGroupToNormal(".card-number-group");
    }
  
    if (update.status.expiry === 2) {
      setNumberFormGroupToError(".expiration-date-group");
    } else if (update.status.expiry === 0) {
      setNumberFormGroupToSuccess(".expiration-date-group");
    } else {
      setNumberFormGroupToNormal(".expiration-date-group");
    }
  
    if (update.status.ccv === 2) {
      setNumberFormGroupToError(".ccv-group");
    } else if (update.status.ccv === 0) {
      setNumberFormGroupToSuccess(".ccv-group");
    } else {
      setNumberFormGroupToNormal(".ccv-group");
    }
  });
}

function fetchPostPrime(url, config, target) {
  fetch(url, config)
    // .then(checkStatus)
    .then(checkResponse)
    .then((data) => {
      if (data) {
        const { order_id, message } = data;
        console.log("data:" + JSON.stringify(data));
        if(order_id){
          target.innerHTML = `
          <div class="orderResult">
            <h4> Enjoy Your Shop!</h4>
            <h4> Order ID: ${order_id}</h4>
            <img src="/public/images/thank_you.png" alt="thank you" style="width:300px; height:300px">
          </div>          
          `;
          const countDiv = document.querySelector(".counter");
          countDiv.textContent = 0;
        }
        if (message) {
          displayTempMessage(message);
        } else {
          displayTempMessage("No Message to display!");
        }
      }
    })
    .catch((err) => {
      displayTempMessage(err);
      console.error("fetch error:", err);
    });
}

function setNumberFormGroupToError(selector) {
  $(selector).addClass("has-error");
  $(selector).removeClass("has-success");
}
function setNumberFormGroupToSuccess(selector) {
  $(selector).removeClass("has-error");
  $(selector).addClass("has-success");
}
function setNumberFormGroupToNormal(selector) {
  $(selector).removeClass("has-error");
  $(selector).removeClass("has-success");
}

