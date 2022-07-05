const express = require("express");
const app = express();
const ExpressError = require("../expressError");
const router = new express.Router();
const db = require("../db");

/** Invoice routes section */

// get all invoices
router.get("/", async function (req, res, next) {
    try {
        const result = await db.query(`SELECT * FROM invoices`);
        return res.json({ invoices: result.rows });
    } catch (e) {
        next(e);
    }
});

// get single invoice based on id
router.get("/:id", async function (req, res, next) {
    try {
        const result = await db.query(`SELECT * FROM invoices WHERE id=$1`, [req.params.id]);
        if (result.rows[0]) {
            const invoice = result.rows[0];
            const comp = await db.query(`SELECT * FROM companies WHERE code=$1`, [invoice.comp_code]);
            invoice.company = comp.rows[0];
            return res.json({ invoice: invoice });
        } else {
            throw new ExpressError("Invoice not found", 404);
        }
    } catch (e) {
        next(e);
    }
});

// create new invoice
router.post("/", async function (req, res, next) {
    try {
        const { comp_code, amt } = req.body;
        const result = await db.query(
            `INSERT INTO invoices (comp_code, amt)
            VALUES ($1, $2)
            RETURNING id, amt, paid, add_date, paid_date`, [comp_code, amt]);
        const invoice = result.rows[0];
        const comp = await db.query(`SELECT * FROM companies WHERE code=$1`, [comp_code]);
        invoice.company = comp.rows[0];
        return res.status(201).json({ invoice: invoice });
    } catch (e) {
        let err = new ExpressError(e.message, 400);
        next(err);
    }
});

// update existing invoice
router.put("/:id", async function (req, res, next) {
    try {
        const exists = await db.query(`SELECT * FROM invoices WHERE id=$1`, [req.params.id]);
        if (exists.rowCount) {
            // invoice exists
            let inv = exists.rows[0];
            if (Object.keys(req.body).includes('paid') && Object.keys(req.body).includes('amt')) {
                // check that request has valid keys
                const { amt, paid } = req.body;
                if (inv.paid && paid == false) {
                    // invoice is paid, update to not paid, clear paid_date
                    const result = await db.query(
                        `UPDATE invoices SET amt=$1, paid=$2, paid_date=$3
                        WHERE id=$4
                        RETURNING id, comp_code, amt, paid, add_date, paid_date`, [amt, paid, null, req.params.id]);

                    return res.json({ invoice: result.rows[0] });
                } else if (inv.paid == false && paid == true) {
                    // invoice is not paid, update to paid, set paid date
                    let date = new Date();
                    const result = await db.query(
                        `UPDATE invoices SET amt=$1, paid=$2, paid_date=$3
                        WHERE id=$4
                        RETURNING id, comp_code, amt, paid, add_date, paid_date`, [amt, paid, date, req.params.id]);

                    return res.json({ invoice: result.rows[0] });
                } else {
                    const result = await db.query(
                        `UPDATE invoices SET amt=$1
                        WHERE id=$2
                        RETURNING id, comp_code, amt, paid, add_date, paid_date`, [amt, req.params.id]);

                    return res.json({ invoice: result.rows[0] });
                }

            } else {
                throw new ExpressError("Needs to be passed JSON with keys 'amt' and 'paid'", 400);
            }
        } else {
            // invoice does not exist
            throw new ExpressError("Invoice not found", 404);
        }

    } catch (e) {
        next(e);
    }
});

// delete invoice
router.delete("/:id", async function (req, res, next) {
    try {
        const result = await db.query(`DELETE FROM invoices WHERE id=$1`, [req.params.id]);
        if (result.rowCount == 1) {
            return res.json({ status: "deleted" })
        } else {
            throw new ExpressError("Invoice not found", 404);
        }
    } catch (e) {
        next(e);
    }
});

/** export router */
module.exports = router;