

document.addEventListener("DOMContentLoaded", function() {
    if (document.getElementById("navbar-placeholder")) {
        fetch("/PurelyHandmade-milestone4/src/assets/layout/navbar.html")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Navbar HTML not found!");
                }
                return response.text();
            })
            .then(data => {
                document.getElementById("navbar-placeholder").innerHTML = data;
            })
            .catch(error => {
                console.error("Error loading navbar:", error);
                document.getElementById("navbar-placeholder").innerHTML = 
                    '<div class="alert alert-danger">Failed to load navigation bar. Please check console for details.</div>';
            });
    }
    if (document.getElementById("footer-placeholder")) {
        fetch("/PurelyHandmade-milestone4/src/assets/layout/footer.html")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Footer HTML not found!");
                }
                return response.text();
            })
            .then(data => {
                document.getElementById("footer-placeholder").innerHTML = data;
            })
            .catch(error => {
                console.error("Error loading footer:", error);
                document.getElementById("footer-placeholder").innerHTML = 
                    '<div class="alert alert-danger">Failed to load footer. Please check console for details.</div>';
            });
    }
}); 