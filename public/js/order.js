$(document).ready(() => {
    console.log("order.js loaded successfully!");

    if (!localStorage.getItem("ordersData")) {
        let defaultOrders = [
            { id: 101, product: "Apple", amount: "$10", orderStatus: "New" },
            { id: 102, product: "Banana", amount: "$15", orderStatus: "Packed" },
            { id: 103, product: "Grapes", amount: "$12", orderStatus: "InTransit" },
            { id: 104, product: "Orange", amount: "$20", orderStatus: "Delivered" }
        ];
        localStorage.setItem("ordersData", JSON.stringify(defaultOrders));
        console.log("Default order data has been saved to localStorage!");
    }

    let ordersData = JSON.parse(localStorage.getItem("ordersData"));
    console.log("Current order data:", ordersData);

    const saveOrdersToLocalStorage = () => {
        localStorage.setItem("ordersData", JSON.stringify(ordersData));
        console.log("Order data updated!");
    };

    const renderOrders = (data) => {
        let tableRow = $("<tr>").addClass("table-row");

        let ID = $("<td>").addClass("table-data-row").text(data.id);
        let product = $("<td>").addClass("table-data-row").text(data.product);
        let amount = $("<td>").addClass("table-data-row").text(data.amount);
        let orderStatus = $("<td>").addClass("table-data-row").text(data.orderStatus);

        let action = $("<td>").addClass("table-data-row");
        let viewButton = $("<button>").text("View").click(() => viewOrder(data.id));
        action.append(viewButton);

        tableRow.append(ID, product, amount, orderStatus, action);
        return tableRow;
    };

    const updateTable = (filteredOrders = ordersData) => {
        console.log("Updating order table...");
        let table = $("#orders-table");
        let ordersCount = $("#order-count");

        ordersCount.text(`Count: ${filteredOrders.length}`);
        table.empty();

        table.append(`
            <tr id="table-heading-row">
                <th class="table-headings">Order ID</th>
                <th class="table-headings">Product</th>
                <th class="table-headings">Amount</th>
                <th class="table-headings">Status</th>
                <th class="table-headings">Action</th>
            </tr>
        `);

        filteredOrders.forEach(order => table.append(renderOrders(order)));
        console.log("Order table updated successfully!");
    };

    $("input[name='filter-orders']").prop("checked", true);
    updateTable();

    $("input[name='filter-orders']").change(() => {
        let selectedFilters = $("input[name='filter-orders']:checked").map(function () {
            return this.value;
        }).get();
        let filteredOrders = ordersData.filter(order => selectedFilters.includes(order.orderStatus));
        updateTable(filteredOrders);
    });

    function viewOrder(orderID) {
        alert(`Displaying details for Order ID: ${orderID}`);
    }

    $("#addOrderButton").click(() => {
        let newOrder = {
            id: ordersData.length + 101,
            product: "Strawberry",
            amount: "$18",
            orderStatus: "New"
        };
        ordersData.push(newOrder);
        saveOrdersToLocalStorage();
        updateTable();
    });


    $("#checkOrderButton").click(() => {
        let inputOrderID = $("#orderID").val().trim();
        if (!inputOrderID) {
            $("#errorMessage").text("Please enter an Order ID!").css("color", "red");
            updateTable();  // 还原表格
            return;
        }

        let filteredOrder = ordersData.filter(order => order.id.toString() === inputOrderID);

        if (filteredOrder.length > 0) {
            updateTable(filteredOrder);
            $("#errorMessage").text(`Order Found: Showing Order ${inputOrderID}`).css("color", "green");
        } else {
            $("#errorMessage").text("Order ID not found!").css("color", "red");
            updateTable([]);
        }
    });
});
