document.addEventListener("DOMContentLoaded", function () {
  // URL Parameters
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get("category");
  const subcategory = urlParams.get("subcategory");
  const productName = urlParams.get("name");

  console.log("Parsed product:", productName, "Category:", category);

  // Image directory path
  const imgPath = "../../assets/img/";

  // Category data
  const categories = {
    "home": "Home & Living",
    "art": "Art & Painting",
    "accessories": "Jewelry & Accessories",
    "ceramics": "Ceramics & Tea"
  };

  const subcategories = {
    "ceramics": "Handmade Ceramics",
    "paintings": "Oil Paintings",
    "necklaces": "Handmade Necklaces",
    "candles": "Candles & Scents"
  };

  // Product Data with multiple images
  const productData = {
    "Handmade Mug": {
      images: ["mug_1.JPG", "mug_2.JPG", "mug_3.JPG"],
      price: 25,
      description: "A beautifully crafted handmade ceramic mug."
    },
    "Handwoven Scarf": {
      images: ["Handwoven_1.JPG", "Handwoven_2.JPG", "Handwoven_3.JPG"],
      price: 40,
      description: "A soft and comfortable handwoven scarf."
    },
    "Wood Carving Art": {
      images: ["Wood_1.JPG", "Wood_2.JPG", "Wood_3.JPG"],
      price: 60,
      description: "Unique wood carving art piece."
    }
  };

  // Update Breadcrumb
  if (category && categories[category]) {
    document.getElementById("breadcrumb-category-link").textContent = categories[category];
    document.getElementById("breadcrumb-category-link").setAttribute("href", `products.html?category=${category}`);
  }

  if (subcategory && subcategories[subcategory]) {
    document.getElementById("breadcrumb-item").textContent = subcategories[subcategory];
  } else if (productName) {
    document.getElementById("breadcrumb-item").textContent = productName;
  }

  // Update Product Details
  if (productName && productData[productName]) {
    const product = productData[productName];

    document.getElementById("product-title").textContent = productName;
    document.getElementById("product-price").textContent = `Price: $${product.price}`;
    document.getElementById("product-description").textContent = product.description;

    // Set main product image
    const mainImage = document.getElementById("product-image");
    mainImage.src = imgPath + product.images[0];

    // Generate thumbnail images
    const thumbnailContainer = document.getElementById("thumbnail-images");
    thumbnailContainer.innerHTML = ""; // Clear previous thumbnails

    product.images.forEach((imgSrc, index) => {
      const thumb = document.createElement("img");
      thumb.src = imgPath + imgSrc;
      thumb.classList.add("thumbnail-img");

      // Default first thumbnail to be active
      if (index === 0) {
        thumb.classList.add("active");
      }

      // Change main image on click
      thumb.addEventListener("click", function () {
        mainImage.src = imgPath + imgSrc;
        document.querySelectorAll(".thumbnail-img").forEach(img => img.classList.remove("active"));
        thumb.classList.add("active");
      });

      thumbnailContainer.appendChild(thumb);
    });

    console.log("Thumbnails generated:", thumbnailContainer.innerHTML); // Debugging

    // "Add to Cart" **
    document.getElementById("addToCart").addEventListener("click", function () {
      const cart = JSON.parse(localStorage.getItem("cart")) || [];

      const newItem = {
        name: productName,
        price: product.price,
        image: imgPath + product.images[0], 
        quantity: 1
      };

     
      const existingItem = cart.find(item => item.name === newItem.name);
      if (existingItem) {
        existingItem.quantity += 1; 
      } else {
        cart.push(newItem); 
      }

      localStorage.setItem("cart", JSON.stringify(cart));

      
      alert(`Added ${productName} to cart!`);
    });

  } else {
    // Handle product not found
    document.getElementById("product-title").textContent = "Product Not Found";
    document.getElementById("product-price").textContent = "";
    document.getElementById("product-description").textContent = "Sorry, this product does not exist.";
  }
});
