const express = require("express");
const router = express.Router({ mergeParams: true });
const reviewController = require("../controllers/reviews");
const { isLoggeIn, isAuthor } = require("../middlware"); // your middleware

// Create a new review
router.post("/", isLoggeIn, reviewController.postReview);

// Delete a review
router.delete("/:reviewId", isLoggeIn, isAuthor, reviewController.deleteReview);

module.exports = router;
