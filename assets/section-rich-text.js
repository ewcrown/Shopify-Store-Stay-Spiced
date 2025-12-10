document.addEventListener("DOMContentLoaded", function () {
  // Select all buttons with the 'data-target-id' attribute
  const buttons = document.querySelectorAll("a[data-target-id]");

  buttons.forEach(function (button) {
    button.addEventListener("click", function (event) {
      if (button.getAttribute("href") === "#") {
        event.preventDefault(); // Prevent default anchor behavior

        // Get the target element's id from the data attribute
        const targetId = button.getAttribute("data-target-id");
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          // Scroll to the target element
          targetElement.scrollIntoView({
            behavior: "smooth",
          });
        } else {
          console.error(`Element with id "${targetId}" not found`);
        }
      }
    });
  });
});
