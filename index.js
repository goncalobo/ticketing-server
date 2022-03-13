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
const background = 'data:image/jpeg;base64,' + fs.readFileSync('./public/assets/bg.jpeg', 'base64');

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
});

const Ticket = mongoose.model('Ticket', ticketSchema);

app.set("view engine", "ejs");
app.use(bp.urlencoded({ extended: false }));
app.use(bp.json());
app.use(express.static('public'))

app.post("/ticket", (req, res) => {
    const { first_name, last_name, occupation, email } = req.body;

    Ticket.find({ email }, function (err, tickets) {
        // Emit new ticket if there are no tickets
        // were issued yet for given email.
        if (tickets.length === 0) {
            const ticket = new Ticket({ first_name, last_name, occupation, email });

            ticket.save().then((r) => {
                const attendee = {
                    id: r._id,
                    first_name,
                    last_name,
                    occupation,
                    email,
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
                                        to: 'goncalobo+test@gmail.com',
                                        subject: 'matosinhos.tech 🏖 live event',
                                        text: "Please show your ticket at the venue",
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
