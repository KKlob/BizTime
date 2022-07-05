process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require("../db");

// declare global test variables here
let company;
let invoice;


/** setup and teardown functions */
beforeAll(async function () {
    // clear reset for both companies and invoices
    await db.query(`DELETE FROM invoices`);
    await db.query(`DELETE FROM companies`);
});

beforeEach(async function () {
    // create one company entry
    let result = await db.query(
        `INSERT INTO companies (code, name, description)
        VALUES ('msft', 'Microsoft', 'Maker of Windows OS')
        RETURNING code, name, description`
    );
    company = result.rows[0];

    // create one invoice for company
    let result2 = await db.query(
        `INSERT INTO invoices (comp_code, amt)
        VALUES ('msft', 299.99)
        RETURNING id, amt, comp_code, paid, add_date, paid_date`
    );
    invoice = result2.rows[0]

});

afterEach(async function () {
    // clear both companies and invoices
    await db.query(`DELETE FROM invoices`);
    await db.query(`DELETE FROM companies`);
});

afterAll(async function () {
    // close db connection
    await db.end();
});

/** Tests section */

describe("Invoice routes", function () {
    test("Get all invoices", async function () {
        const resp = await request(app).get(`/invoices`);

        expect(resp.statusCode).toEqual(200);
        expect(resp.body.invoices).toEqual(
            expect.arrayContaining(
                [expect.objectContaining(
                    { amt: 299.99, comp_code: 'msft' }
                )]
            )
        );
    });

    test("Get one invoice", async function () {
        const resp = await request(app).get(`/invoices/${invoice.id}`);

        expect(resp.statusCode).toEqual(200);
        expect(resp.body.invoice).toEqual(
            expect.objectContaining(
                { id: invoice.id, comp_code: invoice.comp_code, amt: invoice.amt, paid: invoice.paid }
            )
        );
    });

    test("Get one invoice, invalid data", async function () {
        const resp = await request(app).get(`/invoice/94378264`);

        expect(resp.statusCode).toEqual(404);
        expect(resp.body).toEqual(
            expect.objectContaining(
                { 'error': expect.any(Object) }
            )
        );
    });

    test("Post new invoice", async function () {
        const resp = await request(app)
            .post(`/invoices`)
            .send({ comp_code: 'msft', amt: 199.99 });

        expect(resp.statusCode).toEqual(201);
        expect(resp.body.invoice.company).toEqual(
            expect.objectContaining(company)
        );
        expect(resp.body.invoice.amt).toEqual(199.99);
    });

    test("Post new invoice, invalid data", async function () {
        const resp = await request(app)
            .post(`/invoices`)
            .send({ comp_code: 'msft' });

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error).toEqual(
            expect.objectContaining(
                { 'message': expect.any(String) }
            )
        );

    });

    test("Edit existing invoice", async function () {
        const resp = await request(app)
            .put(`/invoices/${invoice.id}`)
            .send({ amt: 199.99 });

        expect(resp.statusCode).toEqual(200);
        expect(resp.body.invoice.comp_code).toEqual('msft');
        expect(resp.body.invoice.amt).toEqual(199.99);
    });

    test("Edit existing invoice, invalid request", async function () {
        const resp = await request(app)
            .put(`/invoices/9084321`)
            .send({ amt: 199.99 });

        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error).toEqual(
            expect.objectContaining(
                { 'message': expect.any(String) }
            )
        );
    });

    test("Delete an invoice", async function () {
        const resp = await request(app)
            .delete(`/invoices/${invoice.id}`);

        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({ status: "deleted" });
    });

    test("Delete an invoice, invalid request", async function () {
        const resp = await request(app)
            .delete(`/invoices/3898234`);

        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error).toEqual(
            expect.objectContaining(
                { 'message': expect.any(String) }
            )
        );
    });
});