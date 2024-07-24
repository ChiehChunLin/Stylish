/* ================================= 
         Header & Footrt
==================================== */
$(".search").hover(
  () => {
    $(".search img").attr("src", "/public/icons/search-hover.png");
  },
  () => {
    $(".search img").attr("src", "/public/icons/search.png");
  }
);
$(".order").hover(
  () => {
    $(".order a img").attr("src", "/public/icons/cart-hover.png");
  },
  () => {
    $(".order a img").attr("src", "/public/icons/cart.png");
  }
);
$(".profile").hover(
  () => {
    $(".profile a img").attr("src", "/public/icons/member-hover.png");
  },
  () => {
    $(".profile a img").attr("src", "/public/icons/member.png");
  }
);
$(".search img").click(clickSearch);
$("#inputSearch").keyup(function (event) {
  if (event.keyCode === 13) {
    clickSearch();
  }
});

$(".product_window").each(function (index) {
  $(this).on("click", function (e) {
    e.stopPropagation();
    renderProductDetails(e);
  });
});
function clickSearch() {
  const keyword = document.getElementById("inputSearch").value;
  if (keyword.trim() !== "") {
    window.location.href = `/api/1.0/products/search?keyword=${keyword}`;
  }
}
function renderProductDetails(e) {
  const windowDiv = e.target.closest(".product_window");
  const id = windowDiv.getAttribute("value");
  if (id.trim() !== "") {
    window.location.href = `/api/1.0/products/details?id=${id}`;
  }
}

/* ================================= 
         SlidesShow Page
==================================== */
let slideIndex = 0;
if (
  window.location.href.includes("products") &&
  !window.location.href.includes("details")
) {
  showSlides();
}

// Next/previous controls
function plusSlides(n) {
  showSlides((slideIndex += n));
}
// Thumbnail image controls
function currentSlide(n) {
  showSlides((slideIndex = n));
}
function showSlides(n) {
  let i;
  let slides = document.getElementsByClassName("mySlides");
  let dots = document.getElementsByClassName("dot");
  if (slides.length > 0 && dots.length > 0) {
    if (n > slides.length) {
      slideIndex = 1;
    }
    if (n < 1) {
      slideIndex = slides.length;
    }
    for (i = 0; i < slides.length; i++) {
      slides[i].style.display = "none";
    }
    for (i = 0; i < dots.length; i++) {
      dots[i].className = dots[i].className.replace(" active", "");
    }
    slides[slideIndex - 1].style.display = "block";
    dots[slideIndex - 1].className += " active";
  }
}
function showSlides() {
  let i;
  let slides = document.getElementsByClassName("mySlides");
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  slideIndex++;
  if (slideIndex > slides.length) {
    slideIndex = 1;
  }
  slides[slideIndex - 1].style.display = "block";
  setTimeout(showSlides, 5000); // Change image every 2 seconds
}
/* ========================================= 
       Product Page && Shopping Cart
============================================ */
$(".color").on("click", function (e) {
  e.stopPropagation();
  $(".color").each(function () {
    $(".color").removeClass("selected");
  });
  $(e.target).addClass("selected");
});
$(".size").on("click", function (e) {
  e.stopPropagation();
  $(".size").each(function () {
    $(".size").removeClass("selected");
  });
  $(e.target).addClass("selected");
});
$("#plus-btn").on("click", function (e) {
  e.stopPropagation();
  const input = e.target.closest(".qty").children[1];
  input.value = Number(input.value) + 1;
});
$("#minus-btn").on("click", function (e) {
  e.stopPropagation();
  const input = e.target.closest(".qty").children[1];
  input.value = Number(input.value) - 1;
  if (input.value == 0) {
    input.value = 1;
  }
});
$(".addCart").on("click", function (e) {
  e.preventDefault();
  const mainDiv = document.getElementsByClassName("main-content")[0];
  const selects = document.getElementsByClassName("selected");
  if (selects.length < 2) {
    console.log("Hi");
    const message = "Please select color and size!";
    $(`<h2 class="message">${message}</h2>`)
      .insertBefore(mainDiv)
      .hide()
      .slideDown(1000)
      .delay(3000)
      .slideUp(500);
    return;
  }
  const product_id = document.getElementsByClassName("id")[0].innerText;
  const color_code = document
    .getElementsByClassName("color selected")[0]
    .getAttribute("value");
  const size = document
    .getElementsByClassName("size selected")[0]
    .getAttribute("value");
  const qty = document.getElementById("qty_input").value;
  const countDiv = document.querySelector(".counter");
  countDiv.textContent = Number(countDiv.textContent) + Number(qty);
  const config = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ product_id, color_code, size, qty }),
  };
  fetchPostDataAndShowResult(
    "/api/1.0/order/addCart",
    config,
    $(".main-content")
  );
});
$("#deleteCart").each(function (index) {
  $(this).on("click", function (e) {
    e.stopPropagation();
    var parentTr = this.closest("tr");
    var product_id = parentTr
      .querySelector(".product_info span:nth-child(2)")
      .getAttribute("value");
    var color_code = parentTr
      .querySelector(".product_info span:nth-child(3)")
      .getAttribute("value");
    var size = parentTr
      .querySelector(".product_info span:nth-child(4)")
      .getAttribute("value");
    var price = parentTr.querySelector(".pTotal").getAttribute("value");
    var qty = parentTr.querySelector(".pQty").getAttribute("value");
    var subtotalElement =
      document.querySelector("table tbody").lastElementChild;
    var subtotalValue = subtotalElement.children[3].getAttribute("value");
    subtotalElement.children[3].children[0].innerText = `$${
      Number(subtotalValue) - Number(price)
    }`;
    const countDiv = document.querySelector(".counter");
    countDiv.textContent = Number(countDiv.textContent) - Number(qty);
    console.log(`${product_id} / ${color_code} / ${size}`);
    const config = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ product_id, color_code, size }),
    };
    fetchPostDataAndShowResult(
      "/api/1.0/order/deleteCart",
      config,
      $(".main-content")
    );
    parentTr.remove();
  });
});
/* ================================= 
         Checkout Page
==================================== */
$("deliveryForm").submit((e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const config = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      "Cache-Control": "no-cache",
    },
    body: formData,
  };
  fetchPostDataAndShowResult("/api/1.0/order/recipient", config, e.target);
});
function fetchPostDataAndShowResult(url, config, target) {
  fetch(url, config)
    .then(checkStatus)
    .then(checkResponse)
    .then((data) => {
      const { message } = data;

      console.log(data);
      if (message) {
        if (message.includes("User Authentication Error!")) {
          window.location.href = `/api/1.0/user/signin`;
          displayTempMessage("Please signin to shop!");
        } else {
          displayTempMessage(message);
        }
      }
    })
    .catch((err) => {
      displayTempMessage(err);
      console.error(`fetch ${url} error:`, err);
    });
}
