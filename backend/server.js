require("dotenv").config(); // to use process.env
const express = require("express"); // import express module
const app = express(); // create express instance

const pg = require("pg"); // import pg module
const pool = new pg.Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const cors = require("cors");
app.use(cors());
app.use(express.json()); // app.use(express.json()) === JSON.parse(textString)

// requires category to be one of these five items.
const allowedCategories = ["Food", "Transport", "Bills", "Entertainment", "Other"];

function validateExpense(body) {

    const title = body.title;
    const amount = body.amount;
    const category = body.category;
    const date = body.date;    
    
    if (!title || typeof title !== "string" || title.trim() === "") {
        return "Title is required and must be text";
    }

    if (amount === undefined || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return "Amount must be a number greater than 0";
    }

    if (!category || !allowedCategories.includes(category)) {
        return `Category must be one of: ${allowedCategories.join(", ")}`;
    }
    if (!date || typeof date !== "string" || date.trim() === "") {
        return "Date is required";
    }
    return null;
}


app.get("/api/expenses", async (req, res) => {

    try { 
        let result = await pool.query("SELECT id, title, amount::FLOAT, category, TO_CHAR(date, 'YYYY-MM-DD') as date FROM expenses ORDER BY date DESC");

        res.json(result.rows); // json.stringify();
    }
    catch(error) {
        res.status(500).json({ error: "Server Error"});    
    }

});

app.get("/api/expenses/:id", async (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
        return res.status(404).json({ message: "Expense not found" });
    }

    try {
        
        let result = await pool.query("SELECT id, title, amount::FLOAT, category, TO_CHAR(date, 'YYYY-MM-DD') as date FROM expenses WHERE id = $1", [ id ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Expense not found" });
        }

        res.json(result.rows[0]);

    } catch(error) {
        res.status(500).json({ error: "Server Error"});    
    }

});

app.post("/api/expenses", async (req, res) => {

    const validationError = validateExpense(req.body);

    if (validationError) {
        return res.status(400).json({ message: validationError });
    }    

    const title = req.body.title;
    const amount = req.body.amount;
    const category = req.body.category;
    const date = req.body.date;

    try {
        let result = await pool.query(
            `INSERT INTO expenses (title, amount, category, date)
             VALUES ($1, $2, $3, $4)
             RETURNING id, title, amount::FLOAT, category, TO_CHAR(date, 'YYYY-MM-DD') as date;`,
             [title, amount, category, date]
        )

        res.status(201).json(result.rows[0]);

    } catch (error) {
        res.status(500).json({ error: "Server Error" });
    }

});

app.put("/api/expenses/:id", async (req, res) => {

    const id = Number(req.params.id);
    
    if (!Number.isInteger(id)) {
        return res.status(404).json({ message: "Expense not found" });
    }

    const validationError = validateExpense(req.body);

    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    const title = req.body.title;
    const amount = req.body.amount;
    const category = req.body.category;
    const date = req.body.date;

    try {

        const result = await pool.query(
            `UPDATE expenses 
             SET title = $1, amount = $2, category = $3, date = $4 
             WHERE id = $5 
             RETURNING id, title, amount::FLOAT, category, TO_CHAR(date, 'YYYY-MM-DD') as date;`,
             [title, amount, category, date, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Expense not found" });
        }

        res.status(200).json(result.rows[0]);

    } catch(error) {
        res.status(500).json({ error: "Server Error" });
    }

});

app.delete("/api/expenses/:id", async (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
        return res.status(404).json({ message: "Expense not found" });
    }

    try {
        let result = await pool.query(
            `DELETE FROM expenses
             WHERE id=$1
             RETURNING id;`,
             [ id ]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Expense not found" });
        }

        res.status(200).json({ message: "Deleted successfully" });

    } catch(error) {
        res.status(500).json({error: "Server Error"});
    }

});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});