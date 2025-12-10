if (!customElements.get("tax-exempt-manager")) {
  customElements.define(
    "tax-exempt-manager",
    class taxExemptManager extends HTMLElement {
      constructor() {
        super();
        this.checkmark = `
        <div>
          <svg xmlns="http://www.w3.org/2000/svg"
            id="latori-tem2-checkmark" width="24" height="24" viewBox="0 0 24 24">
            <path fill="#00FF00" d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z" />
          </svg>
        </div>`;
        this.redmark = `
        <div>
          <svg xmlns="http://www.w3.org/2000/svg"
            id="latori-tem2-redmark" width="24" height="24" viewBox="5 5 30 30">
            <path class="latori-tem2-close-x" fill="#FF0000" d="M 10,10 L 30,30 M 30,10 L 10,30" />
          </svg>
        </div>`;
        this.loadingSpinner = `
        <div>
          <svg class="latori-tem2-spinner" id="latori-tem2-loading-spinner" width="24" height="24" viewBox="0 0 50 50">
            <circle class="latori-tem2-path" cx="25" cy="25" r="15" fill="none" stroke-width="2">
            </circle>
          </svg>
        </div>`;
        this.vatAccountPage = () =>
          document.getElementById("latori-tem2-account-page");
        this.vatIdInputCartPage = document.querySelector(
          'input[name="latori-tem2-vat-id"]',
        );
        this.vatIdAccountPageInput = document.getElementById(
          "latori-tem2-account-page-vat-id-input",
        );
        this.hiddenVatInput = () =>
          document.getElementById("latori-tem2-hidden-input");
        this.data = () => {
          const dataScript = document.getElementById("latori-tem2-data");
          const data = dataScript === null ? null : JSON.parse(dataScript.text);

          return data;
        };

        this.url = () => this.data.app?.url;
        this.message = () =>
          document.querySelector(".latori-tem2-container .latori-tem2-message");
        this.getPath = (action) => {
          const a = document.createElement("a");
          a.href = action;

          return a.pathname;
        };

        this.handler = (XHR) => {
          const message = this.message();
          const data = this.data();

          if (XHR.readyState === 4 && XHR.status === 200) {
            const { response } = XHR;

            if (response?.vat?.exists === true) {
              message.innerHTML = `${this.checkmark}${this.renderMessage(data.shop.valid)}`;
            } else if (response?.vat?.exists === false) {
              message.innerHTML = `${this.redmark}${this.renderMessage(data.shop.invalid)}`;
            } else if (!response?.vat?.exists) {
              message.innerHTML = `${this.redmark}${this.renderMessage(data.shop.viesDown)}`;
            } else {
              message.innerHTML = `${this.redmark}${this.renderMessage(data.shop.wrongSyntax)}`;
            }
          } else {
            message.innerHTML = `${this.redmark}${this.renderMessage(data.shop.serverDown)}`;
          }
        };

        this.renderMessage = (msg) => `<div><span>${msg}</span></div>`;
        this.toggleButton = (btn, disabled) => {
          if (disabled) {
            btn.setAttribute("disabled", "");
          } else {
            btn.removeAttribute("disabled");
          }
        };

        this.disableDeleteBtn = (btn) => {
          if (this.vatIdAccountPageInput.dataset.vatId === "") {
            this.toggleButton(btn, true);
          } else {
            this.toggleButton(btn, false);
          }
        };

        this.disableSaveBtn = (btn) => {
          if (this.vatIdAccountPageInput.value === "") {
            this.toggleButton(btn, true);
          } else {
            this.toggleButton(btn, false);
          }
        };

        this.loadingState = (el) => {
          if (el.classList.contains("latori-tem2-hide")) {
            el.classList.remove("latori-tem2-hide");
          }

          const element = el;
          element.innerHTML = this.loadingSpinner;
        };

        this.isCheckoutButton = (target) => {
          if (target.form) {
            const action = target.form.getAttribute("action");
            if (action.search(/^\/checkout\b/) !== -1) {
              return true;
            }
            if (
              action.search(/^\/cart\b/) !== -1 &&
              target.getAttribute("name") === "checkout"
            ) {
              return true;
            }
            if (
              action.search(/\/[a-zA-Z]{2}(-[a-zA-Z]{2})?\/cart/) !== -1 &&
              target.getAttribute("name") === "checkout"
            ) {
              return true;
            }
            const path = this.getPath(action);
            if (path.search(/^\/checkout\b/) !== -1) {
              return true;
            }
            if (
              path.search(/^\/cart\b/) !== -1 &&
              target.getAttribute("name") === "checkout"
            ) {
              return true;
            }
            if (
              path.search(/\/[a-zA-Z]{2}(-[a-zA-Z]{2})?\/cart/) !== -1 &&
              target.getAttribute("name") === "checkout"
            ) {
              return true;
            }
          }
          return false;
        };

        this.httpRequest = (
          method,
          endpoint,
          payload = {},
          handler = null,
          callback = null,
        ) => {
          const sendMethod = method.toUpperCase() || "POST";

          const XHR = new XMLHttpRequest();
          XHR.open(sendMethod, endpoint, true);

          XHR.setRequestHeader("Content-Type", "application/json");
          XHR.setRequestHeader(
            "Content-Security-Policy",
            `connect-src 'self' ${this.url}`,
          );

          XHR.responseType = "json";
          XHR.timeout = 10000;

          XHR.send(payload);
          XHR.onreadystatechange = () => {
            if (handler) handler(XHR);
            if (callback) callback(XHR);
          };
        };

        this.submitButton = document.getElementById(
          "latori-tem2-save-vat-button",
        );

        this.deleteButton = document.getElementById(
          "latori-tem2-delete-vat-button",
        );

        this.onload = () => {
          const message = this.message();
          const data = this.data();
          const url = data?.app?.url;

          if (this.vatAccountPage() !== null) {
            const { vatIdAccountPageInput } = this;

            vatIdAccountPageInput.dataset.vatId = vatIdAccountPageInput.value;
            const customerId = data.customer.id;
            const shopifyDomain = data.shop.domain;

            this.vatIdAccountPageInputEventHandler = () => {
              this.disableSaveBtn(this.submitButton);
            };

            this.vatIdAccountPageInput.addEventListener(
              "input",
              this.vatIdAccountPageInputEventHandler,
            );

            this.disableDeleteBtn(this.deleteButton);
            this.disableSaveBtn(this.submitButton);

            this.sumitButtonClickEventHandler = (e) => {
              e.preventDefault();

              this.toggleButton(this.submitButton, true);
              this.toggleButton(this.deleteButton, true);

              this.loadingState(message);

              const value = vatIdAccountPageInput.value
                .replace(/\s/g, "")
                .toUpperCase();
              const payload = { vat: { vat_id: value } };

              this.httpRequest(
                "POST",
                `${url}/api/v1/vat/validate?shopify_domain=${shopifyDomain}`,
                JSON.stringify(payload),
                (XHR) => this.handler(XHR),
                (XHR) => {
                  if (XHR.response && XHR.response?.vat?.exists) {
                    vatIdAccountPageInput.value = value;
                    vatIdAccountPageInput.dataset.vatId =
                      vatIdAccountPageInput.value;

                    const payloadSetCustomer = {
                      customer: {
                        vat_id: value,
                        customer_id: customerId,
                        shopify_domain: shopifyDomain,
                      },
                    };

                    this.loadingState(message);
                    this.toggleButton(this.submitButton, true);
                    this.toggleButton(this.deleteButton, true);

                    this.httpRequest(
                      "POST",
                      `${url}/api/v1/customer/set`,
                      JSON.stringify(payloadSetCustomer),
                      undefined,
                      (req) => {
                        if (req.status === 200) {
                          message.innerHTML = `${this.checkmark}${this.renderMessage(data.shop.vatSaveMessage)}`;

                          this.disableSaveBtn(this.submitButton);
                          this.toggleButton(this.deleteButton, false);
                        } else {
                          this.disableSaveBtn(this.submitButton);
                          this.disableDeleteBtn(this.deleteButton);
                        }
                      },
                    );
                  } else {
                    vatIdAccountPageInput.value =
                      vatIdAccountPageInput.dataset.vatId;

                    this.disableSaveBtn(this.submitButton);
                    this.disableDeleteBtn(this.deleteButton);
                  }
                },
              );
            };

            this.submitButton.addEventListener(
              "click",
              this.sumitButtonClickEventHandler,
            );

            this.deleteButtonClickEventHandler = () => {
              this.loadingState(message);

              this.toggleButton(this.submitButton, true);
              this.toggleButton(this.deleteButton, true);

              const payload = {
                customer: {
                  customer_id: customerId,
                  shopify_domain: shopifyDomain,
                },
              };
              this.httpRequest(
                "POST",
                `${url}/api/v1/customer/unset`,
                JSON.stringify(payload),
                undefined,
                (res) => {
                  if (res.status === 200) {
                    vatIdAccountPageInput.value = "";
                    vatIdAccountPageInput.dataset.vatId = "";
                    message.innerHTML = `${this.checkmark}${this.renderMessage(data.shop.vatDeletedMessage)}`;

                    this.disableSaveBtn(this.submitButton);
                  }
                },
              );
            };

            this.deleteButton.addEventListener(
              "click",
              this.deleteButtonClickEventHandler,
            );
          }
          if (this.vatIdInputCartPage !== null) {
            const { vatIdInputCartPage } = this;
            const vatIdRequired = data.vat_id_required;

            const shopifyDomain = data.shop.domain;

            vatIdInputCartPage.value = this.hiddenVatInput().value;
            vatIdInputCartPage.placeholder = data.shop.placeholderMessage;

            this.vatIdInputCartPageEventHandler = (e) => {
              e.preventDefault();
              e.stopPropagation();
            };

            this.vatIdInputCartPage.addEventListener(
              "change",
              this.vatIdInputCartPageEventHandler,
            );

            this.documentClickEventHandler = (e) => {
              if (e.target.form !== undefined) {
                if (this.isCheckoutButton(e.target)) {
                  const value = vatIdInputCartPage.value
                    .replace(/\s/g, "")
                    .toUpperCase();

                  if (value === "" && vatIdRequired === "false") {
                    return;
                  }
                  e.preventDefault();
                  e.stopPropagation();

                  const { form } = e.target;

                  this.loadingState(message);

                  const payload = { vat: { vat_id: value } };

                  this.httpRequest(
                    "POST",
                    `${url}/api/v1/vat/validate?shopify_domain=${shopifyDomain}`,
                    JSON.stringify(payload),
                    (XHR) => this.handler(XHR),
                    (XHR) => {
                      if (XHR.readyState === 4) {
                        if (XHR.response?.vat?.exists) {
                          this.hiddenVatInput().value = value;

                          let baseUrl = window?.Shopify?.routes?.root;

                          if (baseUrl === undefined || baseUrl === null) {
                            baseUrl = "/";
                          }

                          form.action = `${baseUrl}checkout?step=contact_information`;
                          form.submit();
                        }
                      }
                    },
                  );
                }
              }
            };

            document.addEventListener("click", this.documentClickEventHandler);
          }
        };
      }

      connectedCallback() {
        this.onload();
      }

      disconnectedCallback() {
        if (this.submitButton) {
          this.submitButton.removeEventListener(
            "click",
            this.sumitButtonClickEventHandler,
          );
        }
        if (this.deleteButton) {
          this.deleteButton.removeEventListener(
            "click",
            this.deleteButtonClickEventHandler,
          );
        }
        if (this.vatIdInputCartPage) {
          this.vatIdInputCartPage.removeEventListener(
            "change",
            this.vatIdInputCartPageEventHandler,
          );
        }
        if (this.vatIdAccountPageInput) {
          this.vatIdAccountPageInput.removeEventListener(
            "input",
            this.vatIdAccountPageInputEventHandler,
          );
        }
        document.removeEventListener("click", this.documentClickEventHandler);
      }
    },
  );
}
