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

describe("Company routes", function () {
    test("Get all companies", async function () {
        const resp = await request(app).get(`/companies`);

        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({ companies: [company] });
    });

    test("Get one company", async function () {
        const resp = await request(app).get(`/companies/msft`);
        company.invoices = [invoice];
        let compResponse = resp.body.company;

        expect(resp.statusCode).toEqual(200);
        expect(compResponse.code).toEqual('msft');
        expect(compResponse.name).toEqual('Microsoft');
        expect(compResponse.invoices[0].amt).toEqual(299.99);
        expect(compResponse.invoices[0].comp_code).toEqual('msft');
    });

    test("Get one company, invalid data", async function () {
        const resp = await request(app).get(`/companies/ibm`);

        expect(resp.statusCode).toEqual(404);
        expect(resp.body).toEqual(
            expect.objectContaining(
                { 'error': expect.any(Object) }
            )
        );
    });

    test("Post new company", async function () {
        const resp = await request(app)
            .post(`/companies`)
            .send({ code: 'ibm', name: 'IBM', description: 'Largest IT company' });

        expect(resp.statusCode).toEqual(201);
        expect(resp.body).toEqual({ company: { code: 'ibm', name: 'IBM', description: 'Largest IT company' } });
    });

    test("Post new company, invalid data", async function () {
        const resp = await request(app)
            .post(`/companies`)
            .send({ code: 'ibm', description: 'Largest IT company' });

        expect(resp.statusCode).toEqual(400);
        expect(resp.body.error).toEqual(
            expect.objectContaining(
                { 'message': expect.any(String) }
            )
        );

    });

    test("Edit existing company", async function () {
        const resp = await request(app)
            .put(`/companies/msft`)
            .send({ name: 'Microsoft', description: "IT company Founded by Bill Gates" });

        expect(resp.statusCode).toEqual(200);
        expect(resp.body.company).toEqual(
            expect.objectContaining(
                { description: "IT company Founded by Bill Gates" }
            )
        );
    });

    test("Edit existing company, invalid request", async function () {
        const resp = await request(app)
            .put(`/companies/ibm`)
            .send({ name: 'IBM' });

        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error).toEqual(
            expect.objectContaining(
                { 'message': expect.any(String) }
            )
        );
    });

    test("Delete a company", async function () {
        const resp = await request(app)
            .delete(`/companies/msft`);

        expect(resp.statusCode).toEqual(200);
        expect(resp.body).toEqual({ status: "deleted" });
    });

    test("Delete a company, invalid request", async function () {
        const resp = await request(app)
            .delete(`/companies/ibm`);

        expect(resp.statusCode).toEqual(404);
        expect(resp.body.error).toEqual(
            expect.objectContaining(
                { 'message': expect.any(String) }
            )
        );
    });
});