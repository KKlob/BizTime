const express = require("express");
const app = express();
const ExpressError = require("../expressError");
const router = new express.Router();
const db = require("../db");
const slugify = require("slugify");

/** Industry routes section */

// get all industries
router.get("/", async function (req, res, next) {
    try {
        const indRes = await db.query(`SELECT * FROM industries`);
        const industries = [];
        for (ind of indRes.rows) {
            const compRes = await db.query(
                `SELECT comp_code FROM company_industry WHERE industry_code = '${ind.code}'`);
            if (compRes.rowCount) {
                let comp_codes = compRes.rows.map(r => r.comp_code);
                industries.push({ code: ind.code, industry: ind.industry, comp_codes: comp_codes });
            } else {
                industries.push(ind);
            }
        }
        return res.json({ industries: industries })
    } catch (e) {
        let err = new ExpressError(e.message, 400);
        next(err);
    }
})

// add an industry
router.post("/", async function (req, res, next) {
    try {
        const { code, industry } = req.body;
        if (code && industry) {
            codename = slugify(code, { replacement: '', lower: true, strict: true });
            const results = await db.query(
                `INSERT INTO industries (code, industry)
                VALUES ($1, $2)
                RETURNING code, industry`, [codename, industry]);
            return res.status(201).json({ industry: results.rows[0] });
        }
        else {
            throw new ExpressError("Request requres JSON with keys 'code' and 'industry'", 400);
        }
    } catch (e) {
        next(e);
    }
})

// associate an industry to a company
router.post("/:code", async function (req, res, next) {
    try {
        const { comp_code } = req.body;
        if (comp_code) {
            // check that /:code is valid
            const indResult = await db.query(`SELECT * FROM industries WHERE code = '${req.params.code}'`);
            if (indResult.rowCount) {
                // check that comp_code is valid
                const compResult = await db.query(`SELECT * FROM companies WHERE code = '${comp_code}'`);
                if (compResult.rowCount) {
                    // insert new relation between industry and company
                    const result = await db.query(`
                        INSERT INTO company_industry (comp_code, industry_code)
                        VALUES ($1, $2)
                        RETURNING comp_code, industry_code`, [comp_code, req.params.code]);
                    return res.status(201).json({ company_industry: result.rows[0] });
                } else {
                    throw new ExpressError(`Company ${comp_code} does not exist`, 400);
                }
            } else {
                throw new ExpressError(`Industry ${req.params.code} does not exist.`, 400);
            }

        } else {
            throw new ExpressError("Request requires JSON with key 'comp_code'");
        }
    } catch (e) {
        next(e);
    }
})


/** export router */

module.exports = router;
