const express = require("express");
const router = express.Router();
const { listingSchema }=require("../schema.js");
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const Listing = require("../models/listing.js");
const { isLoggeIn, isOwner} = require("../middlware.js");
const multer  = require('multer');
const {storage}= require("../cloudConfig.js");

const upload = multer({storage });


const listingController = require("../controllers/listing.js");




const validateListing = (req,res,next) => {
  let {error} = listingSchema.validate(req.body);
    if(error){
      let errMsg =error.details.map((el) => el.message).join(",");
      throw new ExpressError(400,errMsg);
    }else{
      next();
    }
}

router
.route("/")
.get( wrapAsync(listingController.index)) //index
.post(validateListing, isLoggeIn,
  upload.single("listing[image]"),        //create
   wrapAsync(listingController.createListing)
);

//new route
router.get("/new", isLoggeIn, listingController.renderNewForm );


router
.route("/:id")
.get(wrapAsync(listingController.showListing)) //show
.put(isLoggeIn,
  isOwner,
  upload.single("listing[image]"),
  validateListing, wrapAsync(listingController.updateListing)) //update
  .delete( isLoggeIn,
  isOwner,
  wrapAsync(listingController.deleteListing)); //delete


//Edit Route
router.get("/:id/edit", isLoggeIn,
  isOwner,
   wrapAsync(listingController.editListing));



    


module.exports = router;