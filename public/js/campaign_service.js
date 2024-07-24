// fetchCampaignList();
fetchProductList();

$("#campaignForm").submit(fetchPostCampaignForm);
// $("#campaignForm").submit(fetchS3Url);

//-------------------------------------
//---------    Functions   ------------
//-------------------------------------
function fetchCampaignList() {
  const config = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/api/1.0/admin/campaign_list", config)
    .then(checkStatus)
    .then(checkResponse)
    .then((data) => {
      if (data) {
        const { campaigns } = data;
        // console.log("data:" + JSON.stringify(data));
        if (campaigns) {
          campaigns.forEach(function (campaign) {
            $("#campaignSelect").append(
              `<option value="${campaign.id}">${campaign.title}</option>`
            );
          });
          console.log(
            `load ${campaigns.length} campaigns to the campaign page.`
          );
        } else {
          displayTempMessage("There is no campaign in the record!");
        }
      }
    })
    .catch((err) => {
      displayTempMessage(err);
      console.error("fetch error:", err);
    });
}
function fetchProductList() {
  const config = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };
  fetch("/api/1.0/admin/product_list", config)
    .then(checkStatus)
    .then(checkResponse)
    .then((data) => {
      if (data) {
        const { products } = data;
        // console.log("data:" + JSON.stringify(data));
        if (products) {
          products.forEach(function (product) {
            $("#productSelect").append(
              `<option value="${product.id}">${product.title}</option>`
            );
          });
          console.log(`load ${products.length} products to the campaign page.`);
        } else {
          displayTempMessage("There is no product in the storage!");
        }
      }
    })
    .catch((err) => {
      displayTempMessage(err);
      console.error("fetch error:", err);
    });
}
function fetchPostCampaignForm(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  // console.log("formData: " + formData);
  // var formDataObj = {};
  // formData.forEach(function (value, key) {
  //   formDataObj[key] = value;
  // });
  // console.log("formData:", formDataObj);

  const config = {
    method: "POST",
    body: formData,
  };
  fetch("/api/1.0/admin/campaignS3", config)
    .then(checkStatus)
    .then(checkResponse)
    .then((data) => {
      console.log(data);
      if (data) {
        const { campaign, message } = data;
        if (message) {
          displayTempMessage(message);
        }
      }
    })
    .catch((err) => {
      displayTempMessage(err);
      console.error("fetch campaignS3 error:", err);
    });
}
async function fetchS3Url(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const imgData = formData.get("image");
  console.log(imgData); // a file object

  //get secure url from server
  const { url } = await fetch("/api/1.0/admin/s3Url").then((res) => res.json());
  console.log(url);

  //post the image directly to the s3 bucket
  const config = {
    method: "PUT",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: imgData,
  };
  await fetch(url, config);

  const imageUrl = url.split("?")[0];
  console.log(imageUrl);

  //post request to my server
  const img = document.createElement("img");
  img.src = imageUrl;
  img.style = "width:50%; height:50%;";
  const div = document.getElementsByClassName("container");
  div.appendChild(img);
}
function displayImage(url) {
  const div = document.getElementsByClassName("content");
  const img = document.createElement("img");
  img.src = url;
  div.appendChild(img);
}
