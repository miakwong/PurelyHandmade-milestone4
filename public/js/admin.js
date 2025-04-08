document.addEventListener("DOMContentLoaded", function () {

    fetch("../../assets/layout/navbar.html")
        .then(response => response.text())
        .then(data => {
            document.getElementById("navbar-placeholder").innerHTML = data;
        })
        .catch(error => console.error("Error loading navbar:", error));


    loadUsers();
    loadOrders();
    loadComments();
});


function loadUsers() {
    let users = JSON.parse(localStorage.getItem("usersData")) || [
        { id: 1, name: "Alice", email: "alice@example.com", status: "Active" },
        { id: 2, name: "Bob", email: "bob@example.com", status: "Disabled" }
    ];

    let userTable = document.getElementById("user-list");
    userTable.innerHTML = "";

    users.forEach(user => {
        userTable.innerHTML += `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.status}</td>
                <td>
                    ${user.status === "Active" ? 
                        `<button class="disable-btn" onclick="toggleUserStatus(${user.id}, 'Disabled')">Disable</button>` :
                        `<button class="enable-btn" onclick="toggleUserStatus(${user.id}, 'Active')">Enable</button>`
                    }
                </td>
            </tr>`;
    });

    localStorage.setItem("usersData", JSON.stringify(users)); 
}

function toggleUserStatus(userId, newStatus) {
    let users = JSON.parse(localStorage.getItem("usersData"));

    let userIndex = users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
        users[userIndex].status = newStatus;
        localStorage.setItem("usersData", JSON.stringify(users));
        loadUsers(); 
    }
}

function loadOrders() {
    let orders = JSON.parse(localStorage.getItem("ordersData")) || [
        { id: 101, user: "Alice", amount: "$50", status: "Processing" },
        { id: 102, user: "Bob", amount: "$30", status: "Completed" }
    ];

    let orderTable = document.getElementById("order-list");
    orderTable.innerHTML = "";

    orders.forEach(order => {
        orderTable.innerHTML += `
            <tr>
                <td>${order.id}</td>
                <td>${order.user}</td>
                <td>${order.amount}</td>
                <td>
                    <select class="order-select" onchange="updateOrderStatus(${order.id}, this.value)">
                        <option value="Processing" ${order.status === "Processing" ? "selected" : ""}>Processing</option>
                        <option value="Completed" ${order.status === "Completed" ? "selected" : ""}>Completed</option>
                        <option value="Cancelled" ${order.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                    </select>
                </td>
                <td><button class="delete-btn" onclick="deleteOrder(${order.id})">Delete</button></td>
            </tr>`;
    });

    localStorage.setItem("ordersData", JSON.stringify(orders));
}

function updateOrderStatus(orderId, newStatus) {
    let orders = JSON.parse(localStorage.getItem("ordersData"));
    let orderIndex = orders.findIndex(order => order.id === orderId);
    if (orderIndex !== -1) {
        orders[orderIndex].status = newStatus;
        localStorage.setItem("ordersData", JSON.stringify(orders));
        loadOrders();
    }
}

function deleteOrder(orderId) {
    let orders = JSON.parse(localStorage.getItem("ordersData"));
    orders = orders.filter(order => order.id !== orderId);
    localStorage.setItem("ordersData", JSON.stringify(orders));
    loadOrders();
}

function loadComments() {
    let comments = JSON.parse(localStorage.getItem("commentsData")) || [
        { id: 1, user: "Alice", text: "Great product!" },
        { id: 2, user: "Bob", text: "Fast delivery, love it!" }
    ];

    let commentList = document.getElementById("comment-list");
    commentList.innerHTML = "";

    comments.forEach(comment => {
        commentList.innerHTML += `
            <li>
                <strong>${comment.user}:</strong> ${comment.text}
                <button class="delete-btn" onclick="deleteComment(${comment.id})">Delete</button>
            </li>`;
    });

    localStorage.setItem("commentsData", JSON.stringify(comments));
}

function deleteComment(commentId) {
    let comments = JSON.parse(localStorage.getItem("commentsData"));
    comments = comments.filter(comment => comment.id !== commentId);
    localStorage.setItem("commentsData", JSON.stringify(comments));
    loadComments();
}

document.addEventListener("DOMContentLoaded", function () {
    loadCommentsPreview();
});

function loadCommentsPreview() {
    let comments = JSON.parse(localStorage.getItem("commentsData")) || [
        { id: 1, user: "Alice", text: "Great product!" },
        { id: 2, user: "Bob", text: "Fast delivery, love it!" },
        { id: 3, user: "Charlie", text: "The quality is amazing!" },
        { id: 4, user: "David", text: "Will buy again for sure!" } 
    ];
    
    let commentList = document.getElementById("comment-list");
    commentList.innerHTML = "";
    
    comments.slice(0, 3).forEach(comment => {
        commentList.innerHTML += `
            <li>
                <strong>${comment.user}:</strong> ${comment.text}
            </li>`;
    });

    localStorage.setItem("commentsData", JSON.stringify(comments));
}
