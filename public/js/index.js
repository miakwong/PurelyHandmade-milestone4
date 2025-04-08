document.addEventListener("DOMContentLoaded", function () {
  const navbar = document.querySelector(".navbar");
  const ourStoryLink = document.getElementById("ourStoryLink");

  // Change background color on scroll
  window.addEventListener("scroll", function () {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  });

  // Dynamically add a new nav item
  const newNavItem = document.createElement("li");
  newNavItem.classList.add("nav-item");

  const newLink = document.createElement("a");
  newLink.classList.add("nav-link");
  newLink.href = "#";
  newLink.textContent = "Contact Us";

  newNavItem.appendChild(newLink);
  document.querySelector(".custom-navbar").appendChild(newNavItem);

  // Toggle Our Story section
  if (ourStoryLink) {
    ourStoryLink.addEventListener("click", function (event) {
      event.preventDefault();
      sidebar.classList.add("d-none");
      designerCarousel.classList.add("d-none");
      renderProducts(products.onSale, "On Sale - Special Discount");
    });
  }
});
