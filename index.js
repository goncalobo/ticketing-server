// Importing the packages that we need
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bp = require("body-parser");
const qr = require("qrcode");

const app = express();

mongoose.connect(
    process.env.MONGODB_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

const ticketSchema = new mongoose.Schema({
    first_name: String,
    last_name: String,
    occupation: String,
    email: String,
});

const Ticket = mongoose.model('Ticket', ticketSchema);

app.set("view engine", "ejs");
app.use(bp.urlencoded({ extended: false }));
app.use(bp.json());
app.use(express.static('public'))

app.post("/ticket", (req, res) => {
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const occupation = req.body.occupation;
    const email = req.body.email;

    if (email.length === 0) res.send("Email is needed");

    const ticket = new Ticket({
        first_name,
        last_name,
        occupation,
        email,
    });

    ticket.save().then((r) => {
        const content = {
            id: r._id,
            first_name,
            last_name,
            occupation,
            email,
        }

        qr.toDataURL(JSON.stringify(content), (err, src) => {
            if (err) res.send("Error occured");

            res.render("ticket", { src, content });
        });
    });
});

const port = (process.env.PORT || 3000);
app.listen(port, () => console.log(`Server at ${port}`));
