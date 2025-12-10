/* SС
  added a function to change the number of slides depending on the width of the block
  Start
*/

window.SC_updateGridClass = function (container, mincol = 2, maxcol = 6) {
  if (!container) return;

  const items = container.querySelectorAll(".product-item");
  if (!items.length) return;

  const sc_grid_items = container.querySelector(".sc-grid--recommendations");

  if (!sc_grid_items) return;

  const containerWidth = container.offsetWidth;
  let columns = 1;

  if (containerWidth >= 1400) {
    columns = 6;
  } else if (containerWidth >= 1024) {
    columns = 5;
  } else if (containerWidth >= 768) {
    columns = 4;
  } else if (containerWidth >= 540) {
    columns = 3;
  } else if (containerWidth >= 480) {
    columns = 2;
  }

  if (mincol >= columns) {
    columns = mincol;
  } else if (maxcol <= columns) {
    columns = maxcol;
  }

  sc_grid_items.className = sc_grid_items.className
    .replace(/\bgrid-\d\b/g, "")
    .trim();
  sc_grid_items.classList.add(`grid-${columns}`);

  const textBlocks = container.querySelectorAll(
    ".product-item__text > .text-size--small"
  );
  if (!textBlocks) return;
  let maxHeight = 0;

  textBlocks.forEach((el) => {
    el.style.height = "auto";
  });

  textBlocks.forEach((el) => {
    maxHeight = Math.max(maxHeight, el.scrollHeight);
  });
  
  textBlocks.forEach((el) => {
    el.style.height = `${maxHeight}px`;
    el.style.minHeight = 'max-content';
  });
  

  const slider = container.querySelector("css-slider");
  if (!slider) return;
  slider.resetSlider(true);
};

/* SC End */

class CartRecommendations extends HTMLElement {
  constructor() {
    super();
    this.generateRecommendations();
  }

  generateRecommendations() {
    const cartItems = document
      .getElementById("AjaxCartForm")
      .querySelectorAll("[data-js-cart-item]");
    if (cartItems.length > 0) {
      fetch(
        `${KROWN.settings.routes.product_recommendations_url}?section_id=${this.dataset.section}&product_id=${cartItems[0].dataset.productId}&limit=${this.dataset.limit}`
      )
        .then((response) => response.text())
        .then((text) => {
          const innerHTML = new DOMParser()
            .parseFromString(text, "text/html")
            .querySelector("[data-js-cart-recommendations-performed]");
          if (
            innerHTML &&
            innerHTML.querySelectorAll("[data-js-product-item]").length > 0
          ) {
            this.innerHTML = innerHTML.innerHTML;
            /* SC Start */
            requestAnimationFrame(() => {
              if (typeof window.SC_updateGridClass === "function") {
                window.SC_updateGridClass(this);
                window.addEventListener("resize", () =>
                  SC_updateGridClass(this)
                );
              }
            });
            /* SC End */
          }
        });
    }
  }
}
customElements.define("cart-recommendations", CartRecommendations);
