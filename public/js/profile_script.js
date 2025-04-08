// Function to update profile photo
function updateProfilePhoto(event) {
    const photo = document.getElementById("profile-img");
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            photo.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Function to validate form before saving changes
document.getElementById("save-btn").addEventListener("click", function(event) {
    let nameInput = document.getElementById("name");
    let emailInput = document.getElementById("email");

   
    if (nameInput.value.trim() === "") {
        alert("Name cannot be empty!");
        event.preventDefault(); 
        return;
    }


    let emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    if (!emailInput.value.match(emailPattern)) {
        alert("Please enter a valid email address!");
        event.preventDefault();
        return;
    }

    alert("Profile updated successfully!");
});

// Function to enlarge profile image on click
document.getElementById("profile-img").addEventListener("click", function () {
    let imgModal = document.createElement("div");
    imgModal.style.position = "fixed";
    imgModal.style.top = "0";
    imgModal.style.left = "0";
    imgModal.style.width = "100%";
    imgModal.style.height = "100%";
    imgModal.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    imgModal.style.display = "flex";
    imgModal.style.justifyContent = "center";
    imgModal.style.alignItems = "center";
    imgModal.style.zIndex = "1000";

    let img = document.createElement("img");
    img.src = this.src;
    img.style.maxWidth = "80%";
    img.style.maxHeight = "80%";
    img.style.borderRadius = "15px";
    img.style.boxShadow = "0 10px 20px rgba(255, 255, 255, 0.2)";

    imgModal.appendChild(img);
    document.body.appendChild(imgModal);

    // Close modal on click
    imgModal.addEventListener("click", function () {
        document.body.removeChild(imgModal);
    });
});
