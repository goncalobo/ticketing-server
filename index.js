require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bp = require("body-parser");
const qr = require("qrcode");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const pdf = require("html-pdf");
const path = require("path");
const fs = require('fs');
const cors = require('cors')


// Assets
const background = 'data:image/jpeg;base64,' + fs.readFileSync('./public/assets/ticket_07.jpg', 'base64');

const app = express();
app.use(cors())

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
        clientId: process.env.OAUTH_CLIENTID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN
    }
});

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
    created_at: Date,
    validated: Boolean,
    validated_at: Date,
});

const Ticket = mongoose.model('Ticket', ticketSchema);

app.set("view engine", "ejs");
app.use(bp.urlencoded({ extended: false }));
app.use(bp.json());
app.use(express.static('public'))

app.post("/validate", (req, res) => {
    const { id } = req.body;

    Ticket.findByIdAndUpdate(id, { validated: true, validated_at: new Date() }, function (err, ticket) {
        if (err || !ticket) {
            res.send({
                status: 'error',
                message: 'Ticket not found.',
            });
        } else if (ticket.validated) {
            res.send({
                status: 'success',
                message: 'Ticket was already validated.',
            });
        } else {
            res.send({
                status: 'success',
                message: 'Ticket was validated!',
            });
        };
    });
});

app.post("/ticket", (req, res) => {
    const { first_name, last_name, occupation, email } = req.body;
    const created_at = new Date();

    Ticket.find({ email }, function (err, tickets) {
        // Emit new ticket if there are no tickets
        // were issued yet for given email.
        if (tickets.length === 0) {
            // Create new ticket
            const ticket = new Ticket({ first_name, last_name, occupation, email, created_at, validated: false });

            ticket.save().then((r) => {
                const attendee = {
                    id: r._id,
                    first_name,
                    last_name,
                    occupation,
                    email,
                    created_at,
                }

                // Create ticket's unique QRCode
                qr.toDataURL(JSON.stringify(attendee), (err, qrCode) => {
                    if (err) {
                        res.send({
                            status: 'error',
                            message: err,
                        });
                    }

                    // Create ticket html view
                    ejs.renderFile(path.join(__dirname, './views/', "ticket.ejs"), {
                        attendee,
                        assets: {
                            qrCode,
                            background,
                        },
                    }, (err, data) => {
                        if (err) {
                            res.send({
                                status: 'error',
                                message: err,
                            });
                        } else {
                            const filename = `ticket_${r._id}.pdf`;
                            const options = { type: 'pdf', quality: 75 };

                            // Convert ticket to pdf
                            pdf.create(data, options).toFile(`./temp/${filename}`, function (err, data) {
                                if (err) {
                                    res.send({
                                        status: 'error',
                                        message: err,
                                    });
                                } else {
                                    const mailOptions = {
                                        from: `matosinhos.tech 🏖<${process.env.MAIL_USERNAME}>`,
                                        to: email,
                                        subject: 'matosinhos.tech 🏖 live event',
                                        html: "<p>Congratulations, you got a ticket!</p>" +
                                            "<p>You're going to matosinhos.tech <b>event.07</b> 🏖 startup techstacks & asynchronous services.</p>" +
                                            "<p>As you know, this event will be in-person, so save your ticket.</p>" + // + to present at the door of Câmara Municipal de Matosinhos.</p>" +
                                            "<p>Keep in mind that doors will open at 18:30, the event will start at 19:00, and we'll have food and drinks to welcome you. At the end of the event, you'll have a chance to network, meet and greet the speakers and members of our community.</p>" +
                                            "<p>Information:" +
                                            "<ul><li><b>date:</b> 31 March 2022</li>" +
                                            "<li><b>start time:</b> 19:00<br/></li>" +
                                            //"<li><b>address:</b> Avenida Dom Afonso Henriques, 4454-510(CM Matosinhos)</li></ul></p>" +
                                            "<p>If you need any other information or contact us, please use hello@matosinhos.tech" +
                                            "<p>See you there 👋<br/>" +
                                            "matosinhos.tech<br/>",
                                        attachments: {
                                            filename: filename,
                                            path: `./temp/${filename}`,
                                        },
                                    };

                                    // Send ticket via nodemailer
                                    transporter.sendMail(mailOptions, function (err, data) {
                                        if (err) {
                                            res.send({
                                                status: 'error',
                                                message: err,
                                            });
                                        } else {
                                            fs.unlinkSync(`./temp/${filename}`);

                                            res.send({
                                                status: 'success',
                                                message: 'A new ticket was sent to your email, see you at the venue!',
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    })
                });
            });
        } else {
            res.send({
                status: 'error',
                message: `A ticket was already issued for ${email}. Please check your email.`,
            });
        }
    });
});

const port = (process.env.PORT || 3000);
app.listen(port, () => console.log(`Server at ${port}`));
