const Listing = require("../models/listing");
const Review = require("../models/reviews");

module.exports.postReview = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) return res.redirect("/listings");

  const review = new Review(req.body.review);
  review.author = req.user._id;

  await review.save();
  listing.reviews.push(review);
  await listing.save();

  res.redirect(`/listings/${id}`);
};

// DELETE review
module.exports.deleteReview = async (req, res) => {
  const { id, reviewId } = req.params;

  // Remove review from listing
  await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });

  // Delete review from collection
  await Review.findByIdAndDelete(reviewId);

  req.flash("success", "Review deleted successfully");
  res.redirect(`/listings/${id}`);
};
