const { newProduct } = require("./db/product-model");
const { genTimeID, genCryptoID } = require("./db/initDataId");
const category = ["men", "women", "accessories"];
const sizes = ["S", "M", "L"];
const colors = [
  {
    color_code: "FA8072",
    color_name: "Salmon",
  },
  {
    color_code: "FF0000",
    color_name: "Red",
  },
  {
    color_code: "B22222",
    color_name: "FireBrick",
  },
  {
    color_code: "8B0000",
    color_name: "DarkRed",
  },
  {
    color_code: "FFC0CB",
    color_name: "Pink",
  },
  {
    color_code: "FFA500",
    color_name: "Orange",
  },
  {
    color_code: "FFD700",
    color_name: "Gold",
  },
  {
    color_code: "E6E6FA",
    color_name: "Lavender",
  },
  {
    color_code: "9370DB",
    color_name: "MediumPurple",
  },
  {
    color_code: "90EE90",
    color_name: "LightGreen",
  },
  {
    color_code: "008000",
    color_name: "Green",
  },
  {
    color_code: "00FFFF",
    color_name: "Aqua",
  },
  {
    color_code: "87CEEB",
    color_name: "SkyBlue",
  },
  {
    color_code: "1E90FF",
    color_name: "DodgerBlue",
  },
  {
    color_code: "8B4513",
    color_name: "SaddleBrown",
  },
  {
    color_code: "BC8F8F",
    color_name: "RosyBrown",
  },
  {
    color_code: "FFF8DC",
    color_name: "Cornsilk",
  },
  {
    color_code: "FFFFFF",
    color_name: "White",
  },
  {
    color_code: "C0C0C0",
    color_name: "Silver",
  },
  {
    color_code: "000000",
    color_name: "Black",
  },
];

const men = 15;
const women = 30;
const access = 5;
const startNum = 0;

function genProductData(x, y, z) {
  const products = [];
  let styleCategory = category[0];
  for (let i = startNum; i < x + y + z + startNum; i++) {
    if (i < x) {
      styleCategory = category[0];
    } else if (x <= i && i < x + y) {
      styleCategory = category[1];
    } else {
      styleCategory = category[2];
    }
    const _product = {
      title: "Product-" + (i + 1),
      price: Math.floor(Math.random() * 10000),
      category: styleCategory,
      description: "description-" + (i + 1),
      texture: "texture",
      wash: "wash",
      place: "place",
      note: "note",
      story: "story",
      variants: genVariants(Math.floor(Math.random() * 3) + 1),
      main_image: `20240522015947-0-8bac89ed98b428dd30231ce116f72ac7`,
      images: [
        "20240522015947-0-25ea6c8fa616d9ed6140593e7395e2e1",
        "20240522015947-1-6420b34207a6e90027bd9fcfbb3dc992",
        "20240522015947-2-efdf63df77a64cb6a1bd8189c81792a6",
      ],
    };
    products.push(_product);
  }
  return products;
}
function genVariants(n) {
  const variants = [];
  for (let i = 0; i < n; i++) {
    const _color = colors[Math.floor(Math.random() * colors.length)];
    sizes.forEach((s) => {
      const variant = {
        color_code: _color.color_code,
        color_name: _color.color_name,
        size: s,
        stock: Math.floor(Math.random() * 500) + 1000,
      };
      variants.push(variant);
    });
  }
  //   console.log(variants);
  return variants;
}
async function insertProducts(data) {
  const maxRetries = 10;
  for (let i = 0; i < data.length; i++) {
    try {
      (function (j) {
        setTimeout(function () {
          const product = newProduct(data[j]);
          if (!product) {
            console.log(`genData: ${product.id} ${product.title}`);
          }
        }, 1000 * j);
      })(i);
    } catch (err) {
      if (err.message.includes("Deadlock")) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => {
            newProduct(data[i]);
          }, 1000);
        } else {
          console.log("Maximun retry attemps reached");
          return false;
        }
      } else {
        console.log(err);
        return false;
      }
    }
  }
  return true;
}

const data = genProductData(men, women, access);
const result = insertProducts(data);
console.log("insertcProducts: %j", result);
