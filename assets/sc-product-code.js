class SCProductCode extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.inputCode = this.querySelector('input[name="code"]');
    this.blockQuantity = this.querySelector(".product-quantity");
    this.inputQuantity = this.querySelector(".product-quantity input");
    this.byButton = this.querySelector(".sc-product-by-code-bybutton");
    this.form = this.querySelector('form[data-type="add-to-cart-form"]');
    this.formInputId = this.form?.querySelector('input[name="id"]');

    if (!this.inputCode || !this.byButton || !this.formInputId) return;

    this.byButton.classList.remove("active");

    let searchTimer;
    this.inputCode.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.handleInput();
      }, 300);
    });
  }

  async handleInput() {
    const code = this.inputCode.value.trim();
    if (!code) return this.reset();

    this.byButton.classList.remove("active");
    this.blockQuantity?.classList.remove("active");

    const variant = await this.fetchVariantByCode(code);

    if (variant && variant.id && variant.available) {
      this.byButton.dataset.variantId = variant.id;
      this.byButton.dataset.id = variant.product_id;
      this.formInputId.value = variant.id;

      this.byButton.classList.add("active");
      this.blockQuantity?.classList.add("active");
    } else {
      this.reset();
    }
  }

  reset() {
    this.byButton.dataset.variantId = "";
    this.byButton.dataset.id = "";
    this.formInputId.value = "";
    if (this.inputQuantity) this.inputQuantity.value = 1;
    this.byButton.classList.remove("active");
    this.blockQuantity?.classList.remove("active");
  }

  async fetchVariantByCode(code) {
    const searchUrl = `/search/suggest.json?q=${encodeURIComponent(
      code
    )}&resources[options][fields]=variants.sku,variants.barcode,title`;
    try {
      let currentVariant = {};
      const res = await fetch(searchUrl, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const data = await res.json();
      const product = data?.resources?.results?.products?.[0];
      if (!product) return {};

      const productRes = await fetch(`/products/${product.handle}.js`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      const fullProduct = await productRes.json();

      let variant = {};
      if (fullProduct.variants.length > 0) {
        variant = fullProduct.variants.find((v) => {
          return (
            v.sku?.toLowerCase() === code.toLowerCase() ||
            v.barcode?.toLowerCase() === code.toLowerCase()
          );
        });

        if (!variant) {
          variant = fullProduct.variants[0];
        }
      }
      if (variant) {
        variant.product_handle = fullProduct.handle;
        variant.product_id = fullProduct.id;
        return variant;
      }

      return {};
    } catch (err) {
      console.error("Variant fetch error:", err);
      return {};
    }
  }
}

customElements.define("sc-product-code", SCProductCode);
