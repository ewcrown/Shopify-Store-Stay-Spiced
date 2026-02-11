let isFetching = false;
var CartProgressBar = class extends HTMLElement {
  constructor() {
    super();
    setTimeout(() => {
      this.target = document.querySelector("#site-cart-sidebar");
      this.total = Number(
        document.querySelector(".progress-bar__wrapper").dataset.total
      );

      if (this.target) {

        if (this.total >= 0) {
          this.lineItems = this.target.querySelectorAll(".cart-item");

          this.goals = Array.from(
            document.querySelectorAll(".progress-bar__goal")
          ).map((goal) => {
            return {
              goal: Number(goal.dataset.goal),
              id: goal.dataset.product,
            };
          });

          this.itemsInCart = Array.from(this.lineItems).map((lineItem) => {
            return {
              id: lineItem.dataset.product,
              quantity: Number(lineItem.dataset.quantity),
              price: Number(lineItem.dataset.price),
              line: lineItem.dataset.line,
            };
          });

          this.nonFreeProducts = Array.from(this.itemsInCart).filter(
            (lineItem) => {
              return Number(lineItem.price) > 0;
            }
          );

          this.freeProducts = Array.from(this.itemsInCart).filter((lineItem) => {
            return Number(lineItem.price) === 0;
          });

          this.removeFromCartProducts = [
            ...this.freeProducts.filter((line) => {
              return this.goals.some((pos) => {
                return pos.id === line.id && pos.goal > this.total;
              });
            }),
            ,
            ...this.freeProducts.filter((line) => line.quantity > 1),
          ].filter((el) => el);

          //   console.log("removeFromcartProducts", this.removeFromCartProducts);

          this.addToCartProducts = this.goals.filter((goal) => {
            return (
              goal.goal < this.total &&
              !this.itemsInCart.some((lineItem) => goal.id === lineItem.id) &&
              goal.id !== "FREESHIPPING"
            );
          });
          //  console.log("addToCartProducts", this.addToCartProducts);

          let response;
          const promises = [];
          console.log("this.removeFromCartProducts", this.removeFromCartProducts);
          console.log("this.itemsInCart", this.itemsInCart);
          console.log("illegal gifts", this.nonFreeProducts);
          // remove unnecessary products from cart
          this.removeFromCartProducts.map((productToRemove) => {
            const promise = this._changeCart(
              productToRemove,
              productToRemove.quantity > 1 ? 1 : 0
            ).then((res) => res.json());
            promises.push(promise);
          });

          // add only relevant products, all at once
          if (this.addToCartProducts.length > 0 && !isFetching) {
            const promise = this._addToCart(this.addToCartProducts).then(
              (res) => {
                isFetching = false;
                return res.json();
              }
            );
            promises.push(promise);
          }

          // Wait for all operations to complete
          Promise.all(promises)
            .then((results) => {
              if (results.length > 0) {
                response = results[results.length - 1];
                reloadCart(response);
              }
            })
            .catch((error) => {
              console.error("An error occurred:", error);
            });
        }

      }
    }, 500); //todo: delete after test
  }
  async _changeCart(product, quantity) {
    let formData = {
      line: product.line,
      quantity,
      sections: "cart-drawer",
    };
    return await fetch(window.Shopify.routes.root + "cart/change.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
  }

  async _addToCart(newLineItems) {
    let formData = {
      items: [
        ...newLineItems.map((p) => {
          return { id: p.id, quantity: 1 };
        }),
      ],
      sections: ["cart-drawer"],
    };
    isFetching = true;
    return await fetch(window.Shopify.routes.root + "cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
  }
};

window.customElements.define("cart-progress-bar", CartProgressBar);

function reloadCart(response) {
  if (
    response &&
    response.sections &&
    response.sections["cart-drawer"] &&
    document.querySelector("#site-cart-sidebar")
  ) {
    document.querySelector("#site-cart-sidebar").innerHTML = new DOMParser()
      .parseFromString(response.sections["cart-drawer"], "text/html")
      .querySelector("#site-cart-sidebar").innerHTML;
  }
}
