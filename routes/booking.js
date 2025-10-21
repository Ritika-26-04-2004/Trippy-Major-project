// routes/bookings.js
const express = require("express");
const router = express.Router();
const { isLoggeIn } = require("../middlware.js");
const bookingController = require("../controllers/booking.js");

// View all my bookings
router.get("/", isLoggeIn, bookingController.myBookings);

// Cancel a booking
router.post("/:id/cancel", isLoggeIn, bookingController.cancelBooking);

module.exports = router;
