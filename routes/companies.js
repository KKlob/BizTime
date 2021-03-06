const express = require("express");
const app = express();
const ExpressError = require("../expressError");
const router = new express.Router();
const db = require("../db");
const slugify = require("slugify");

/** Company routes section */

// get all companies
router.get("/", async function (req, res, next) {
    try {
        const results = await db.query('SELECT * FROM companies');
        return res.json({ companies: results.rows })
    } catch (e) {
        next(e);
    }
});

// get single company
router.get("/:code", async function (req, res, next) {
    try {
        const results = await db.query(
            `SELECT c.code, c.name, c.description, i.industry
                FROM companies AS c 
                    LEFT JOIN company_industry AS ci 
                        ON c.code = ci.comp_code 
                    LEFT JOIN industries AS i
                        ON ci.industry_code = i.code
                WHERE c.code = $1`, [req.params.code]);
        if (results.rowCount) {
            let { code, name, description } = results.rows[0];
            const industries = results.rows.map(r => r.industry);
            const invResp = await db.query(`SELECT * FROM invoices WHERE comp_code=$1`, [code]);
            if (invResp.rowCount) {
                const invoices = invResp.rows;

                return res.json({ company: { code: code, name: name, description: description, industries: industries, invoices: invoices } });
            } else {
                return res.json({ company: { code: code, name: name, description: description, industries: industries } });
            }
        } else {
            throw new ExpressError("Company not found", 404);
        }
    } catch (e) {
        next(e);
    }
});

// add a new company
router.post("/", async function (req, res, next) {
    try {
        const { name, description } = req.body;
        const code = slugify(name, {
            replacement: '',
            lower: true,
            strict: true
        });
        const results = await db.query(`
            INSERT INTO companies (code, name, description)
            VALUES ($1, $2, $3)
            RETURNING code, name, description`, [code, name, description]);
        return res.status(201).json({ company: results.rows[0] });
    } catch (e) {
        let err = new ExpressError(e.message, 400);
        next(err);
    }
});

// edit existing company
router.put("/:code", async function (req, res, next) {
    try {
        const { name, description } = req.body;
        const result = await db.query(
            `UPDATE companies SET name=$1, description=$2
            WHERE code=$3
            RETURNING code, name, description`, [name, description, req.params.code]);

        if (result.rows[0]) {
            return res.json({ company: result.rows[0] })
        } else {
            throw new ExpressError("Company not found", 404);
        }
    } catch (e) {
        next(e);
    }
});

// delete company
router.delete("/:code", async function (req, res, next) {
    try {
        const result = await db.query(`DELETE FROM companies WHERE code=$1`, [req.params.code]);
        if (result.rowCount == 1) {
            return res.json({ status: "deleted" })
        } else {
            throw new ExpressError("Company not found", 404);
        }
    } catch (e) {
        next(e);
    }
});


/** export router */
module.exports = router;