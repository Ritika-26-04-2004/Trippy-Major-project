document.addEventListener("DOMContentLoaded", () => {
  const stars = document.querySelectorAll("#starRating .star");
  const ratingInput = document.getElementById("ratingInput");

  stars.forEach(star => {
    star.addEventListener("click", () => {
      const value = parseInt(star.dataset.value);
      ratingInput.value = value;

      // Fill stars
      stars.forEach(s => s.style.color = "#ccc");
      for (let i = 0; i < value; i++) {
        stars[i].style.color = "gold";
      }
    });

    star.addEventListener("mouseenter", () => {
      const value = parseInt(star.dataset.value);
      stars.forEach(s => s.style.color = "#ccc");
      for (let i = 0; i < value; i++) stars[i].style.color = "gold";
    });

    star.addEventListener("mouseleave", () => {
      const current = parseInt(ratingInput.value);
      stars.forEach(s => s.style.color = "#ccc");
      for (let i = 0; i < current; i++) stars[i].style.color = "gold";
    });
  });
});
