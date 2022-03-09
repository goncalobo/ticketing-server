// Importing the packages that we need
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const bp = require("body-parser");
const qr = require("qrcode");


mongoose.connect(
    process.env.MONGODB_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

const ticketSchema = new mongoose.Schema({
    ticket_no: Number,
    first_name: String,
    last_name: String,
    ocupation: String,
    email: String,
});

const Ticket = mongoose.model('Ticket', ticketSchema);

app.set("view engine", "ejs");
app.use(bp.urlencoded({ extended: false }));
app.use(bp.json());
app.use(express.static('public'))

app.post("/scan", (req, res) => {
    const email = req.body.email;

    // If the input is null return "Empty Data" error
    if (email.length === 0) res.send("Empty Data!");

    // Let us convert the input stored in the email and return it as a representation of the QR Code image contained in the Data URI(Uniform Resource Identifier)
    // It shall be returned as a png image format
    // In case of an error, it will save the error inside the "err" variable and display it

    const ticket = new Ticket({
        ticket_no: 1,
        first_name: 'lol',
        last_name: 'lol',
        ocupation: 'lol',
        email: email,
    });
    ticket.save().then((r) => {

        const content = JSON.stringify({
            id: r._id,
            first_name: r.first_name,
            last_name: r.first_name,
            ocupation: r.ocupation,
            email: r.email,
        }, 0, 1);

        qr.toDataURL(content, (err, src) => {
            if (err) res.send("Error occured");

            // Let us return the QR code image as our response and set it to be the source used in the webpage
            res.render("scan", { src });
        });
    });
});

// Setting up the port for listening requests
const port = (process.env.PORT || 3000);
app.listen(port, () => console.log(`Server at ${port}`));
