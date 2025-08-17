const Listing = require("../models/listing");

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req,res) =>{
    res.render("listings/new.ejs");
};

module.exports.showListing=async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id).populate("owner");
  if(!listing){
     req.flash("error","listing you have requested does not exist!");
    return res.redirect("/listings");
  }

  res.render("listings/show.ejs", { listing });
};

module.exports.createListing=async (req,res,next) => {
  let url = req.file.path;
  let filename = req.file.filename;
 console.log(req.body);
 const newListing = new Listing(req.body.listing);
 newListing.owner=req.user._id;
 newListing.image={url,filename};
    await newListing.save();
    req.flash("success","new listing created!");
    res.redirect("/listings");
   };

   module.exports.editListing=async (req, res) => {
     let { id } = req.params;
     const listing = await Listing.findById(id);
      if(!listing){
        req.flash("error","listing you have requested does not exist!");
       return res.redirect("/listings");
     }
     res.render("listings/edit.ejs", { listing });
   };

   module.exports.updateListing=async (req, res) => {
     let { id } = req.params;
     req.flash("success","listing updated!");
     //await Listing.findByIdAndUpdate(id, { ...req.body.listing });
     const listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true });

  // If a new image is uploaded
  if (req.file) {
    listing.image = {
      url: req.file.path,
      filename: req.file.filename
    };
    await listing.save();
  }

     res.redirect(`/listings/${id}`);
   };

   module.exports.deleteListing=async (req, res) => {
     let { id } = req.params;
     let deletedListing = await Listing.findByIdAndDelete(id);
     req.flash("success","listing deleted!");
     console.log(deletedListing);
     res.redirect("/listings");
   };
   