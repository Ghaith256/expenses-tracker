const API_URL = "http://localhost:3000/api/expenses";


const editForm = document.getElementById("edit-form");
const monthFilter = document.getElementById("month-filter");
const titleFilter = document.getElementById("title-filter");

function showAlert(message, container = document.getElementById("alert-container")) {
    const alert = document.createElement("div");
    alert.className = "alert alert-danger alert-dismissible fade show";
    alert.setAttribute("role", "alert");
    
    alert.textContent = message; 
    
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn-close";
    closeButton.dataset.bsDismiss = "alert";
    alert.appendChild(closeButton);
    
    container.innerHTML = ""; 
    container.appendChild(alert);
}

async function getExpenses() {
    try {
        const response = await fetch(API_URL);

        const result = await response.json();

        if (!response.ok) 
            throw new Error(result.message);
        
        return result;

    } catch (error) {
        if (error instanceof TypeError) 
            showAlert("Cannot reach the server. Make sure it is running.");
        else 
            showAlert(error.message);
        
    }
}

async function addExpense(data) {
    
    try {

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) 
            throw new Error(result.message);
        
        await refresh();

        return result;

    } catch (error) {
        if (error instanceof TypeError) 
            showAlert("Cannot reach the server. Make sure it is running.");
        else 
            showAlert(error.message);
        
    }
}

async function updateExpense(id, data) {
    
    try {
        
        const response = await fetch(API_URL + "/" + id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) 
            throw new Error(result.message);
        

        await refresh();

        return result;

    } catch (error) {
        if (error instanceof TypeError) 
            showAlert("Cannot reach the server. Make sure it is running.");
        else 
            showAlert(error.message);
        
    }

}

async function deleteExpense(id) {

    try {

        const response = await fetch(API_URL + "/" + id, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) 
            throw new Error(result.message);
        

        await refresh();

        return result;

    } catch (error) {
        if (error instanceof TypeError) 
            showAlert("Cannot reach the server. Make sure it is running.");
        else 
            showAlert(error.message);
        
    }
}

let allExpenses = [];

async function refresh() {
    const spinner = document.getElementById("loading-spinner");

    spinner.classList.remove("d-none");

    try {
        const expenses = await getExpenses();

        if (expenses === undefined) 
            return; // on getExpenses(), catch block does not have a return so if it was
                    // executed, it will return undefined.        

        allExpenses = expenses;

        // NEW: rebuild the Month dropdown from the fresh data BEFORE drawing the table,
        // because updateTable() reads monthFilter.value.
        populateMonthOptions();

        updateTable(); // CHANGED: was applyCategoryFilter()
        renderSummary(allExpenses);

    } finally {
        spinner.classList.add("d-none");
    }
}

function renderTable(expenses) {

    const tbody = document.getElementById("expenses-table-body");
    tbody.innerHTML = "";

    const categoryColors = {
        Food: "bg-success",
        Transport: "bg-primary",
        Bills: "bg-warning text-dark",
        Entertainment: "bg-info text-dark",
        Other: "bg-secondary"
    };

expenses.forEach(function (expense) {
        const row = document.createElement("tr");

        const badge = document.createElement("span");
        badge.className = "badge " + categoryColors[expense.category];
        badge.textContent = expense.category;
        const categoryCell = document.createElement("td");
        categoryCell.appendChild(badge);

        const actionsCell = document.createElement("td");
        actionsCell.className = "text-end";
        actionsCell.innerHTML = `
            <button class="btn btn-sm btn-outline-secondary me-1 edit-btn" data-id="${expense.id}">Edit</button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${expense.id}">Delete</button>
        `;

        const titleCell = document.createElement("td");
        titleCell.textContent = expense.title;

        const amountCell = document.createElement("td");
        amountCell.textContent = expense.amount.toFixed(2);

        const dateCell = document.createElement("td");
        dateCell.textContent = expense.date;

        row.appendChild(titleCell);
        row.appendChild(amountCell);
        row.appendChild(categoryCell);
        row.appendChild(dateCell);
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });
}

// "02" -> "February". 
function formatMonth(month) {
    // Any year works, because only the month name is shown (dummy year).
    // - 1 is because the date on javascript is zero-based.
    // Also a dummy day.
    const date = new Date(Date.UTC(2000, Number(month) - 1, 1));  // Date object.
    
    // en-US -> determine the language of months names.
    // long  -> give full name, (Februaru not Feb, e.g.).
    // UTC   -> To avoid TimeZone problems.
    return date.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });

}

// Builds the Month dropdown from the months that exist in the data (no year).
// January 2025 and January 2026 both become one "January" option.
function populateMonthOptions() {

    // "2026-02-02".slice(5, 7) is "02"; Set removes duplicates across years,
    // sort() puts them in calendar order, January to December.

    // 1. Extract only the month part from all expenses
    const allMonths = allExpenses.map(function (expense) {
        return expense.date.slice(5, 7);
    }); // so we now have an array of the existing months only (duplicated).

    // 2. Remove duplicates by passing the array into a Set
    const uniqueMonthsSet = new Set(allMonths); // Array ---> Set

    // 3. Convert the Set back into a regular Array using the .from().
    const uniqueMonthsArray = Array.from(uniqueMonthsSet);

    // 4. Sort the array alphabetically/numerically
    const sortedMonths = uniqueMonthsArray.sort();

    // Rebuilding resets the select, so remember the selection first.
    const previous = monthFilter.value;

    monthFilter.replaceChildren(new Option("All months", "All"));

    sortedMonths.forEach(function (month) {
        monthFilter.appendChild(new Option(formatMonth(month), month));
    });

    // Keep the selection if that month still exists, otherwise fall back to All.
    monthFilter.value = sortedMonths.includes(previous) ? previous : "All";
}

function getVisibleExpenses() {
    const selectedCategory = document.getElementById("category-filter").value;
    const selectedMonth = monthFilter.value;
    const titleQuery = titleFilter.value.trim().toLowerCase();

    return allExpenses.filter(function (expense) {
        const matchesCategory = (selectedCategory === "All" || expense.category === selectedCategory);
        const matchesMonth = (selectedMonth === "All" || expense.date.slice(5, 7) === selectedMonth);
        const matchesTitle = (titleQuery === "" || expense.title.toLowerCase().startsWith(titleQuery));

        return matchesCategory && matchesMonth && matchesTitle;
    });
}

function updateTable() {
    renderTable(getVisibleExpenses());
}

document.getElementById("category-filter").addEventListener("change", updateTable); 
monthFilter.addEventListener("change", updateTable); 
titleFilter.addEventListener("input", updateTable);




// Add expense row.
const form = document.getElementById("expense-form");

form.addEventListener("submit", async function (event) {
    event.preventDefault(); // to stop auto-refresh when clicking.

    if (!form.checkValidity()) { // checks for required and min.
        form.classList.add("was-validated");
        return;
    }

    const data = {
        title: document.getElementById("title").value,
        amount: Number(document.getElementById("amount").value),
        category: document.getElementById("category").value,
        date: document.getElementById("date").value
    };

    const result = await addExpense(data);

    if (result === undefined) 
        return;


    form.reset();
    form.classList.remove("was-validated");
});

function renderSummary(expenses) {

    const totalCard = document.getElementById("total-card");
    const countCard = document.getElementById("number-of-expenses-card");
    const highestCard = document.getElementById("highest-expense-card");
    const highestCategory = document.getElementById("highest-expense-category");

    if (expenses.length === 0) {
        totalCard.textContent = "0.00";
        countCard.textContent = "0";
        highestCard.textContent = "0.00";
        highestCategory.textContent = "";
        return;
    }

    const total = expenses.reduce(function (sum, expense) {
        return sum + expense.amount;
    }, 0);

    const highest = expenses.reduce(function (max, expense) {
        return expense.amount > max.amount ? expense : max;
    });

    totalCard.textContent = total.toFixed(2);
    countCard.textContent = expenses.length;
    highestCard.textContent = highest.amount.toFixed(2);
    highestCategory.textContent = highest.category;
}

document.getElementById("expenses-table-body").addEventListener("click", async function (event) {

    const deleteButton = event.target.closest(".delete-btn");
    if (deleteButton) {
        if (confirm("Are you sure you want to delete this expense?")) {
            const id = deleteButton.dataset.id;
            await deleteExpense(id);
        }
        return;
    }

    const editButton = event.target.closest(".edit-btn");
    if (editButton) {
        const id = editButton.dataset.id;
        openEditModal(id);
        return;
    }
});

function openEditModal(id) {

    const expense = allExpenses.find(function (e) {
        return e.id === Number(id);
    });

    if (!expense) 
        return;

    const modalElement = document.getElementById("edit-modal");
    modalElement.dataset.id = expense.id;

    editForm.classList.remove("was-validated");

    document.getElementById("edit-title").value = expense.title;
    document.getElementById("edit-amount").value = expense.amount;
    document.getElementById("edit-category").value = expense.category;
    document.getElementById("edit-date").value = expense.date;

    new bootstrap.Modal(modalElement).show();
}

    document.getElementById("edit-save-btn").addEventListener("click", async function () {

    if (!editForm.checkValidity()) {
        editForm.classList.add("was-validated");
        return;
    }

    const modalElement = document.getElementById("edit-modal");
    const id = modalElement.dataset.id;

    const data = {
        title: document.getElementById("edit-title").value,
        amount: Number(document.getElementById("edit-amount").value),
        category: document.getElementById("edit-category").value,
        date: document.getElementById("edit-date").value
    };

    const result = await updateExpense(id, data);

    if (result === undefined)
        return;

    editForm.classList.remove("was-validated");

    bootstrap.Modal.getInstance(modalElement).hide();
});

refresh();