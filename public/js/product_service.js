$("#addVariantBtn").click(function (e) {
  e.preventDefault();
});
$("#productForm").submit(fetchPostProductForm);

//-------------------------------------
//---------    Functions   ------------
//-------------------------------------
function fetchPostProductForm(e) {
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
  fetch("/api/1.0/admin/productS3", config)
    .then(checkStatus)
    .then(checkResponse)
    .then((data) => {
      console.log(data);
      if (data) {
        const { product, message } = data;
        if (message) {
          displayTargetTempMessage("body", message);
        }
        // document.getElementById('productForm').reset();
      }
    })
    .catch((err) => {
      console.log("fetch newProduct error:", err);
      displayTargetTempMessage("body", err.message);
    });
}
function addVariant() {
  var variantsDiv = document.getElementById("variants");
  var div = document.createElement("div");
  div.className = "form-row";
  div.innerHTML = `
                    <div class="col-md-4 mb-3">
                        <label for="size">Size</label>
                        <input type="text" class="form-control" id="size" name="sizes[]" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="stock">Stock</label>
                        <input type="number" class="form-control" id="stock" name="stocks[]" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="colorCode">Color Code</label>
                        <input type="color" class="form-control" id="color_code" name="color_codes[]" required>
                    </div>
                    <div class="col-md-4 mb-3">
                        <label for="colorName">Color Code</label>
                        <input type="text" class="form-control" id="color_name" name="color_names[]" required>
                    </div>
                    <button class="btn" onclick="deleteVariant(this)">X</button>
                `;
  variantsDiv.appendChild(div);
}
function deleteVariant(btn) {
  const row = btn.closest(".form-row");
  row.remove();
}
