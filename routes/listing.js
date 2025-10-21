const express = require("express");
const router = express.Router();
const { listingSchema }=require("../schema.js");
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const Listing = require("../models/listing.js");
const { isLoggeIn, isOwner} = require("../middlware.js"); // 👈 kept as-is
const multer  = require('multer');
const {storage}= require("../cloudConfig.js");

const upload = multer({storage });

const listingController = require("../controllers/listing.js");
const Booking = require("../models/booking");

// ✅ Validation Middleware
const validateListing = (req,res,next) => {
  let {error} = listingSchema.validate(req.body);
  if(error){
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400,errMsg);
  } else {
    next();
  }
};

// ✅ INDEX + CREATE
router
.route("/")
.get(wrapAsync(listingController.index)) // index
.post(
  validateListing,
  isLoggeIn,
  upload.fields([
    { name: "listing[image]", maxCount: 1 },
    { name: "listing[gallery]", maxCount: 6 }, // ✅ added gallery upload
  ]),
  wrapAsync(listingController.createListing)
);

// ✅ NEW FORM
router.get("/new", isLoggeIn, listingController.renderNewForm);
router.post("/search", listingController.searchListing);


// ✅ OPTIONAL: FILTER BY PLACE ROUTE
router.get("/place/:place", wrapAsync(listingController.filterByPlace));

// ✅ MY BOOKINGS + CANCEL
router.get("/my-bookings", isLoggeIn, listingController.myBookings);
router.post("/my-bookings/:id/cancel", isLoggeIn, listingController.cancelBooking);

// ✅ SHOW / UPDATE / DELETE
router
.route("/:id")
.get(wrapAsync(listingController.showListing)) // show
.put(
  isLoggeIn,
  isOwner,
  upload.fields([
    { name: "listing[image]", maxCount: 1 },
    { name: "listing[gallery]", maxCount: 6 }, // ✅ added gallery for update
  ]),
  validateListing,
  wrapAsync(listingController.updateListing)
)
.delete(
  isLoggeIn,
  isOwner,
  wrapAsync(listingController.deleteListing)
);

// ✅ EDIT ROUTE
router.get("/:id/edit", isLoggeIn, isOwner, wrapAsync(listingController.editListing));

// ✅ BOOKING ROUTES
router.get("/:id/book", isLoggeIn, listingController.bookListing);

// router.get("/:id/checkout", async (req, res) => {
//   const listing = await Listing.findById(req.params.id);
//   res.render("listings/checkout", { listing });
// });

// ✅ CHECKOUT PROCESS
router.post("/:id/checkout", listingController.processBooking);
router.post("/:id/create-checkout-session", listingController.createCheckoutSession);

// ✅ SUCCESS PAGE
router.get("/checkout/success", async (req, res) => {
  const { bookingId } = req.query;
  if (bookingId) {
    await Booking.findByIdAndUpdate(bookingId, { status: "paid" });
  }
  res.render("listings/success");
});

// ✅ CANCEL PAGE
router.get("/checkout/cancel", async (req, res) => {
  const { bookingId } = req.query;
  if (bookingId) {
    await Booking.findByIdAndUpdate(bookingId, { status: "cancelled" });
  }
  res.render("listings/cancel");
});

module.exports = router;
