if (typeof CSSSlider !== "function") {
  class CSSSlider extends HTMLElement {
    constructor() {
      super();

      this._touchScreen = document.body.classList.contains("touchevents");

      this._rtl = document.documentElement.getAttribute("dir") == "rtl";

      // create option object, from defaults
      this.o = {
        ...{
          selector: ".css-slide",
          snapping: true,
          groupCells: false,
          autoHeight: false,
          navigation: true,
          navigationDOM: `<span class="css-slider-button css-slider-prev" style="display:none">←</span>
            <span class="css-slider-button css-slider-next" style="display:none">→</span>`,
          thumbnails: true,
          thumbnailsDOM: `<div class="css-slider-dot-navigation" style="display:none"></div>`,
          indexNav: false,
          indexNavDOM: `<div class="css-slider-index-navigation"><span class="css-slider-current">1</span> / <span class="css-slider-total">1</span></div>`,
          watchCSS: false,
          undisplay: false,
          disableSwipe: false,
          listenScroll: false,
          observer: true,
          disableMouseDownEvent: true,
          autoplay: 0,
          loop: false,
        },
        ...JSON.parse(this.dataset.options),
      };

      // init slider or watch for css
      if (!this.o.watchCSS) {
        this.initSlider();
      } else {
        this.RESIZE_WATCHER = debounce(() => {
          const afterContent = window.getComputedStyle(this, ":after").content;
          if (afterContent.includes("css-slide") && !this.sliderEnabled) {
            this.initSlider();
          } else if (
            !afterContent.includes("css-slide") &&
            this.sliderEnabled
          ) {
            this.destroySlider();
          }
        }, 100);
        window.addEventListener("resize", this.RESIZE_WATCHER);
        this.RESIZE_WATCHER();
      }
    }

    destroySlider() {
      this._removeLoopClones();
      this.innerHTML = `${this.originalHTML}`;
      this.classList.remove("enabled");
      this.sliderEnabled = false;
      window.removeEventListener("resize", this.RESIZE_EVENT);
      window.removeEventListener("scroll", this.SCROLL_EVENT);
      window.removeEventListener("scroll", this.SCROLL_EVENT_ANIMATION);
    }

    initSlider() {
      // create custom events

      this._readyEvent = new CustomEvent("ready");
      this._changeEvent = new CustomEvent("change");
      this._scrollEvent = new CustomEvent("scroll");
      this._navEvent = new CustomEvent("navigation");
      this._resetEvent = new CustomEvent("reset");
      this._pointerDownEvent = new CustomEvent("pointerDown");
      this._pointerUpEvent = new CustomEvent("pointerUp");

      // create slider structure

      this.classList.add("css-slider");
      this.originalHTML = this.innerHTML;
      this.innerHTML = `<div class="css-slider-viewport">
        <div class="css-slider-holder">
          <div class="css-slider-container">
            ${this.originalHTML}
          </div>
        </div>
      </div>`;

      // add css-slide to children, if it's not set
      if (this.o.undisplay) {
        this.querySelectorAll(`${this.o.selector}`).forEach((elm) => {
          elm.style.display = "block";
        });
      }

      if (this.o.selector != ".css-slide") {
        this.querySelectorAll(`${this.o.selector}`).forEach((elm) => {
          elm.classList.add("css-slide");
        });
      }

      // setup variables

      this.element = this.querySelector(".css-slider-holder");
      if (this.o.groupCells) {
        this.element.scrollLeft = 0;
      }

      // Get items, excluding clones
      const allItems = this.querySelectorAll(`${this.o.selector}`);
      this.items = Array.from(allItems).filter(item => {
        // Check if item itself is a clone or has clone parent
        const isClone = item.classList.contains("css-slide-clone") || 
                       item.hasAttribute("data-is-clone") ||
                       item.closest(".css-slide-clone, [data-is-clone='true']");
        return !isClone;
      });
      this.indexedItems = [];
      this.index = 0;
      this.length = this.items.length;
      this.windowWidth = window.innerWidth;
      this.loopClones = [];
      this.loopStartOffset = 0;

      if (this.o.disableMouseDownEvent) {
        this.querySelector(".css-slider-container").addEventListener(
          "mousedown",
          (e) => {
            e.preventDefault();
          },
        );
      }

      this.viewport = this.querySelector(".css-slider-viewport");
      if (this.o.autoHeight) {
        this.viewport.classList.add("auto-height");
      }

      // append navigation

      if (this.o.navigation || this.o.thumbnails || this.indexNav) {
        let container = document.createElement("div");
        container.classList.add("css-slider-navigation-container");
        container.innerHTML = `
          ${this.o.navigation ? this.o.navigationDOM : ""}
          ${this.o.thumbnails ? this.o.thumbnailsDOM : ""}
          ${this.o.indexNav ? this.o.indexNavDOM : ""}`;

        if (this.o.navigation) {
          this.prevEl = container.querySelector(".css-slider-prev");
          this.prevEl.addEventListener("click", (e) => {
            e.preventDefault();
            this.changeSlide("prev");
            this.dispatchEvent(this._navEvent);
          });
          this.nextEl = container.querySelector(".css-slider-next");
          this.nextEl.addEventListener("click", (e) => {
            e.preventDefault();
            this.changeSlide("next");
            this.dispatchEvent(this._navEvent);
          });
        }

        if (this.o.thumbnails) {
          this.thumbnailsEl = container.querySelector(
            ".css-slider-dot-navigation",
          );
        }

        if (this.o.indexNav) {
          this.indexEl = container.querySelector(".css-slider-current");
          this.lengthEl = container.querySelector(".css-slider-total");
        }

        this.append(container);
      }

      if (this.length > 1) {
        // add observer

        if (this.o.observer) {
          this.OBSERVER = new IntersectionObserver(
            (entries) => {
              if (!this._sliderBlockScroll) {
                entries.forEach((entry) => {
                  // Skip clones in observer
                  if (entry.target.classList.contains("css-slide-clone") || 
                      entry.target.hasAttribute("data-is-clone")) {
                    return;
                  }
                  
                  // Handle loop scroll jump for observer mode
                  if (this.o.loop && this.loopClones.length > 0 && entry.intersectionRatio >= 0.5) {
                    const scrollLeft = this.element.scrollLeft;
                    const firstRealItem = this.indexedItems[0];
                    const lastRealItem = this.indexedItems[this.indexedItems.length - 1];
                    
                    if (firstRealItem && lastRealItem) {
                      const firstItemMargin = parseInt(getComputedStyle(firstRealItem).marginLeft || 0);
                      const firstRealPosition = firstRealItem.offsetLeft - firstItemMargin;
                      const lastRealPosition = lastRealItem.offsetLeft + lastRealItem.offsetWidth - firstItemMargin;
                      
                      // Check if we're at end clones
                      if (scrollLeft >= lastRealPosition - 1) {
                        const overflow = scrollLeft - lastRealPosition;
                        const jumpOffset = firstRealPosition + overflow;
                        this._sliderBlockScroll = true;
                        this.element.scrollLeft = jumpOffset;
                        setTimeout(() => {
                          this._sliderBlockScroll = false;
                        }, 10);
                        return;
                      }
                      
                      // Check if we're at beginning clones
                      if (scrollLeft < firstRealPosition - 1) {
                        const underflow = firstRealPosition - scrollLeft;
                        const jumpOffset = lastRealPosition - underflow;
                        this._sliderBlockScroll = true;
                        this.element.scrollLeft = jumpOffset;
                        setTimeout(() => {
                          this._sliderBlockScroll = false;
                        }, 10);
                        return;
                      }
                    }
                  }
                  
                  if (entry.intersectionRatio >= 0.5) {
                    const dataIndex = entry.target.getAttribute("data-index");
                    if (dataIndex !== null && !isNaN(dataIndex)) {
                      this.index = parseInt(dataIndex);
                      this.checkSlide();
                      this.dispatchEvent(this._changeEvent);
                    }
                  }
                });
              }
            },
            {
              threshold: [0, 0.5],
            },
          );
        } else {
          let scrollRAF = null;
          this.SCROLL_EVENT = () => {
            if (this._sliderBlockScroll) return;
            
            const scrollLeft = this.element.scrollLeft;
            
            // Handle loop scroll jump - check FIRST before normal scroll detection
            if (this.o.loop && this.loopClones.length > 0 && this.indexedItems.length > 0) {
              const firstRealItem = this.indexedItems[0];
              const lastRealItem = this.indexedItems[this.indexedItems.length - 1];
              
              if (firstRealItem && lastRealItem) {
                const firstItemMargin = parseInt(getComputedStyle(firstRealItem).marginLeft || 0);
                const firstRealPosition = firstRealItem.offsetLeft - firstItemMargin;
                const lastRealPosition = lastRealItem.offsetLeft + lastRealItem.offsetWidth - firstItemMargin;
                
                // Check if we're at or past the end clones (after real slides)
                if (scrollLeft >= lastRealPosition - 1) {
                  const overflow = scrollLeft - lastRealPosition;
                  const jumpOffset = firstRealPosition + overflow;
                  this._sliderBlockScroll = true;
                  this.element.scrollLeft = jumpOffset;
                  setTimeout(() => {
                    this._sliderBlockScroll = false;
                  }, 10);
                  return;
                }
                
                // Check if we're at the beginning clones (before real slides)
                if (scrollLeft < firstRealPosition - 1) {
                  const underflow = firstRealPosition - scrollLeft;
                  const jumpOffset = lastRealPosition - underflow;
                  this._sliderBlockScroll = true;
                  this.element.scrollLeft = jumpOffset;
                  setTimeout(() => {
                    this._sliderBlockScroll = false;
                  }, 10);
                  return;
                }
              }
            }
            
            // Normal scroll detection - only run if we didn't jump
            if (!this._sliderBlockScroll) {
              const scrollItems = this.indexedItems.entries();
              const scrollArray = Array.from(scrollItems, (elm) =>
                Math.abs(elm[1].offsetLeft - this.element.scrollLeft),
              );
              const scrollDistance = Math.min(...scrollArray);
              const scrollIndex = scrollArray.indexOf(scrollDistance);
              if (scrollIndex != this.index && scrollIndex >= 0) {
                this.index = scrollIndex;
                this.checkSlide();
                this.dispatchEvent(this._changeEvent);
              }
            }
          };

          // Use requestAnimationFrame for smooth scroll detection
          this.element.addEventListener("scroll", () => {
            if (scrollRAF) {
              cancelAnimationFrame(scrollRAF);
            }
            scrollRAF = requestAnimationFrame(this.SCROLL_EVENT);
          }, { passive: true });
        }

        // reset on resize

        this.RESIZE_EVENT = debounce(() => {
          if (this.windowWidth != window.innerWidth && this.o.groupCells) {
            const wasLooping = this.o.loop;
            this.resetSlider();
            // Recreate clones after resize if loop was enabled
            if (wasLooping && this.o.loop) {
              setTimeout(() => {
                this._createLoopClones(false);
              }, 250);
            }
          }
          if (!this.o.groupCells) {
            this.checkSlide();
          }
          this.windowWidth = window.innerWidth;
        }, 100);
        window.addEventListener("resize", this.RESIZE_EVENT);
        this.resetSlider(true);

        // dispatching scroll event, mostly for extra animations
        if (this.o.listenScroll) {
          this.SCROLL_EVENT_ANIMATIONS = () => {
            let slidesWidth = -this.querySelector(".css-slider-container")
              .offsetWidth;
            this.items.forEach((elm) => {
              slidesWidth += elm.offsetWidth;
            });
            this.progress = this.element.scrollLeft / slidesWidth;
            this.dispatchEvent(this._scrollEvent);
          };
          this.element.addEventListener(
            "scroll",
            this.SCROLL_EVENT_ANIMATIONS,
            { passive: true },
          );
        }

        if (
          !this.o.disableSwipe &&
          !this._touchScreen &&
          !this.element.classList.contains("css-slider--singular")
        ) {
          this.element.addEventListener("mousedown", (e) => {
            if (
              !this.element.classList.contains("css-slider--disable-dragging")
            ) {
              this.mouseX = e.screenX;
              this.element.classList.add("can-drag");
              this.element.classList.add("mouse-down");
            }
          });
          this.element.addEventListener("mouseup", (e) => {
            this.element.classList.remove("mouse-down");
            this.element.classList.remove("can-drag");
            this.element.classList.remove("pointer-events-off");
            if (this._pot) clearTimeout(this._pot);
          });

          this.element.addEventListener("mouseleave", (e) => {
            this.element.classList.remove("mouse-down");
            this.element.classList.remove("can-drag");
            this.element.classList.remove("pointer-events-off");
            if (this._pot) clearTimeout(this._pot);
          });

          this.element.addEventListener("mousemove", (e) => {
            if (this.element.classList.contains("can-drag")) {
              let directionX = this.mouseX - e.screenX;
              if (Math.abs(directionX) > 1) {
                if (!this.element.classList.contains("css-slider--no-drag")) {
                  this.element.classList.add("pointer-events-off");
                }
                if (
                  (!this._rtl && directionX > 0) ||
                  (this._rtl && directionX < 0)
                ) {
                  this.changeSlide("next");
                  this.element.classList.remove("can-drag");
                } else if (
                  (!this._rtl && directionX < 0) ||
                  (this._rtl && directionX > 0)
                ) {
                  this.changeSlide("prev");
                  this.element.classList.remove("can-drag");
                }
              }
            }
          });
        }

        // helper for browser that don't support smooth scrolling

        if (
          !("scrollBehavior" in document.documentElement.style) &&
          !this._touchScreen
        ) {
          this.element.classList.add("force-disable-snapping");
        }

        if (!this._touchScreen) {
          this.element.ondragstart = (e) => {
            e.preventDefault();
          };
        }
      }

      // dispatch ready event

      this.classList.add("enabled");
      this.sliderEnabled = true;
      this.dispatchEvent(this._readyEvent);

      // check for autoplay

      if (parseInt(this.o.autoplay) > 0) {
        this._initAutoplay();
      }
    }

    changeSlide(direction, behavior = "smooth") {
      // function that changes the slide, either by word (next/prev) or index

      if (direction == "next") {
        if (this.o.loop) {
          // Loop: wrap around to first slide if at the end
          this.index = (this.index + 1) % this.length;
        } else {
          // No loop: stop at the end
          if (this.index + 1 < this.length) {
            this.index++;
          } else {
            return; // Can't go further
          }
        }
      } else if (direction == "prev") {
        if (this.o.loop) {
          // Loop: wrap around to last slide if at the beginning
          this.index = this.index - 1 < 0 ? this.length - 1 : this.index - 1;
        } else {
          // No loop: stop at the beginning
          if (this.index - 1 >= 0) {
            this.index--;
          } else {
            return; // Can't go further
          }
        }
      } else if (parseInt(direction) >= 0) {
        const targetIndex = parseInt(direction);
        if (targetIndex >= 0 && targetIndex < this.length) {
          this.index = targetIndex;
        } else {
          return; // Invalid index
        }
      }

      this._sliderBlockScroll = true;
      setTimeout(() => {
        this._sliderBlockScroll = false;
      }, 500);

      this.checkSlide();
      
      // Calculate scroll position - ensure we're using real indexed items, not clones
      if (this.indexedItems[this.index]) {
        const firstItemMargin = parseInt(getComputedStyle(this.indexedItems[0]).marginLeft || 0);
        let scrollLeft = this.indexedItems[this.index].offsetLeft - firstItemMargin;
        
        if (this._rtl && this.slidesPerPage > 1) {
          scrollLeft = (this.querySelector(".css-slider-container").offsetWidth -
            (this.indexedItems[this.index].offsetLeft - firstItemMargin)) * -1;
        }
        
        this.element.scrollTo({
          top: 0,
          left: scrollLeft,
          behavior: behavior,
        });
        this.dispatchEvent(this._changeEvent);
      }
    }

    checkSlide() {
      // checks slide after index change and updates navigation / viewport

      if (this.o.navigation) {
        this.prevEl.classList.remove("disabled");
        this.nextEl.classList.remove("disabled");
        // Only disable navigation buttons if loop is disabled
        if (!this.o.loop) {
          if (this.index == 0) {
            this.prevEl.classList.add("disabled");
          }
          if (this.index == this.length - 1) {
            this.nextEl.classList.add("disabled");
          }
        }
      }

      if (this.o.thumbnails && this.thumbnails) {
        this.thumbnails.forEach((elm) => {
          elm.classList.remove("active");
        });
        this.thumbnails[this.index].classList.add("active");
      }

      if (this.o.indexNav) {
        this.indexEl.textContent = this.index + 1;
      }

      if (this.o.autoHeight) {
        this.viewport.style.height =
          this.indexedItems[this.index].offsetHeight + "px";
      }

      this.indexedItems.forEach((elm, i) => {
        if (i == this.index) {
          elm.classList.add("css-slide-active");
        } else {
          elm.classList.remove("css-slide-active");
        }
      });

      if (parseInt(this.o.autoplay) > 0) {
        this._initAutoplay();
      }
    }

    afterAppend() {
      // Re-query items, excluding clones
      const allItems = this.querySelectorAll(`${this.o.selector}`);
      this.items = Array.from(allItems).filter(item => {
        // Check if item itself is a clone or has clone parent
        const isClone = item.classList.contains("css-slide-clone") || 
                       item.hasAttribute("data-is-clone") ||
                       item.closest(".css-slide-clone, [data-is-clone='true']");
        return !isClone;
      });
    }

    _initAutoplay() {
      if (this._autoplayInterval) {
        clearInterval(this._autoplayInterval);
      }
      this._autoplayInterval = setInterval(() => {
        if (this.index + 1 == this.length) {
          this.changeSlide(0);
        } else {
          this.changeSlide("next");
        }
      }, parseInt(this.o.autoplay));
    }

    resetSlider(nojump = false, resetIndex = true) {
      let slidesWidth = 0,
        page = 0,
        pages = 0,
        totalWidth = this.querySelector(".css-slider-container").offsetWidth, // - 20,
        hideNavigation = false;

      // reset entire slider
      // Don't remove clones here - they'll be recreated if needed
      const hadClones = this.loopClones.length > 0;

      this.slidesPerPage = 0;
      this.indexedItems = [];
      this.element.classList.add("disable-snapping");
      if (this.OBSERVER) {
        this.OBSERVER.disconnect();
      }

      // find out how many pages (slides there are now)
      // Re-query items to exclude clones
      const allItems = this.querySelectorAll(`${this.o.selector}`);
      this.items = Array.from(allItems).filter(item => {
        // Check if item itself is a clone or has clone parent
        const isClone = item.classList.contains("css-slide-clone") || 
                       item.hasAttribute("data-is-clone") ||
                       item.closest(".css-slide-clone, [data-is-clone='true']");
        return !isClone;
      });

      this.items.forEach((elm, i) => {
        elm.classList.remove("css-slide--snap");
        slidesWidth += elm.offsetWidth;
        if (slidesWidth > totalWidth && this.slidesPerPage == 0) {
          this.slidesPerPage = i;
        }
      });

      if (this.slidesPerPage == 0) {
        this.slidesPerPage = this.items.length;
        hideNavigation = true;
      }

      const sliderDifference = totalWidth - slidesWidth;
      if (sliderDifference < 60) {
        this.setAttribute("data-slides-per-page-difference", "small");
      } else if (sliderDifference >= 60) {
        this.setAttribute("data-slides-per-page-difference", "large");
      }

      // set each slide for observer - skip clones

      this.items.forEach((elm, i) => {
        // Skip clones when setting up snap points
        if (elm.classList.contains("css-slide-clone") || elm.hasAttribute("data-is-clone")) {
          return;
        }
        if (i % this.slidesPerPage == 0) {
          elm.classList.add("css-slide--snap");
          elm.setAttribute("data-index", page++);
          if (this.OBSERVER) {
            this.OBSERVER.observe(elm);
          }
        }
      });

      this.indexedItems = this.querySelectorAll(
        `${this.o.selector}.css-slide--snap`,
      );
      if (resetIndex) {
        this.index = 0;
      }
      this.length = Math.ceil(this.items.length / this.slidesPerPage);
      
      // Create loop clones if loop is enabled - do it after everything is set up
      if (this.o.loop && this.length > 1 && this.indexedItems.length > 0) {
        // Wait for layout to be complete, then create clones
        setTimeout(() => {
          this._createLoopClones(resetIndex);
        }, 300);
      } else {
        // Only remove clones if loop is disabled
        if (!this.o.loop) {
          this._removeLoopClones();
        }
      }

      // recreate navigation

      if (this.o.thumbnails) {
        this.thumbnailsEl.innerHTML = "";
        for (let i = 0; i < this.length; i++) {
          let dot = document.createElement("span");
          dot.classList.add("css-slider-dot");
          dot.dataset.index = i;
          this.thumbnailsEl.appendChild(dot);
          dot.addEventListener("click", (e) => {
            this.changeSlide(e.target.dataset.index);
          });
        }
        this.thumbnailsEl.style.setProperty("--size", this.length);
        this.thumbnails = this.thumbnailsEl.querySelectorAll(".css-slider-dot");
      }

      if (this.o.indexNav) {
        this.indexEl.textContent = this.index + 1;
        this.lengthEl.textContent = this.length;
      }

      // hide navigation if only one slide

      if (hideNavigation) {
        this.element.classList.add("css-slider--no-drag");
        if (this.o.navigation) {
          this.prevEl.style.display = "none";
          this.nextEl.style.display = "none";
        }
        if (this.o.thumbnails) {
          this.thumbnailsEl.style.display = "none";
        }
      } else {
        this.element.classList.remove("css-slider--no-drag");
        if (this.o.navigation) {
          this.prevEl.style.display = "block";
          this.nextEl.style.display = "block";
        }
        if (this.o.thumbnails) {
          this.thumbnailsEl.style.display = "block";
        }
      }

      this.checkSlide();

      if (!nojump) {
        // If loop is enabled, wait for clones to be created before setting scroll
        // Otherwise scroll to start
        if (!this.o.loop || this.loopClones.length > 0) {
          // For loop, scroll position is set in _createLoopClones
          if (!this.o.loop) {
            this.element.scrollTo({
              top: 0,
              left: 0,
              behavior: "auto",
            });
          }
        }
      }
      this.element.classList.remove("disable-snapping");

      this.setAttribute("data-slider-length", this.length);

      this.dispatchEvent(this._resetEvent);
    }

    _createLoopClones(resetIndex = false) {
      const container = this.querySelector(".css-slider-container");
      if (!container) return;
      
      // Re-query to get current state (in case resetSlider was called)
      const allItems = this.querySelectorAll(`${this.o.selector}`);
      const realItems = Array.from(allItems).filter(item => {
        const isClone = item.classList.contains("css-slide-clone") || 
                       item.hasAttribute("data-is-clone") ||
                       item.closest(".css-slide-clone, [data-is-clone='true']");
        return !isClone;
      });
      
      // Re-query indexed items (snap points)
      const currentIndexedItems = this.querySelectorAll(`${this.o.selector}.css-slide--snap`);
      const realIndexedItems = Array.from(currentIndexedItems).filter(item => {
        const isClone = item.classList.contains("css-slide-clone") || 
                       item.hasAttribute("data-is-clone") ||
                       item.closest(".css-slide-clone, [data-is-clone='true']");
        return !isClone;
      });
      
      if (realIndexedItems.length === 0 || realItems.length === 0) {
        return;
      }
      
      // Remove existing clones first
      this._removeLoopClones();
      
      // Get the first and last real indexed items (snap points)
      const firstIndexedItem = realIndexedItems[0];
      const lastIndexedItem = realIndexedItems[realIndexedItems.length - 1];
      
      if (!firstIndexedItem || !lastIndexedItem) {
        return;
      }
      
      // Clone the last indexed item and prepend to beginning
      const lastClone = lastIndexedItem.cloneNode(true);
      // Mark as clone
      lastClone.classList.add("css-slide-clone", "css-slide-clone-start");
      lastClone.setAttribute("data-clone-index", realIndexedItems.length - 1);
      lastClone.setAttribute("data-is-clone", "true");
      // Remove snap class from clone so it doesn't interfere with indexing
      lastClone.classList.remove("css-slide--snap");
      // Ensure the cloned element itself is marked (in case it matches the selector)
      if (lastClone.matches && lastClone.matches(this.o.selector)) {
        lastClone.classList.add("css-slide-clone");
      }
      // Mark any nested elements that match the selector
      const lastCloneChildren = lastClone.querySelectorAll(this.o.selector);
      lastCloneChildren.forEach(slide => {
        slide.classList.add("css-slide-clone");
        slide.setAttribute("data-is-clone", "true");
      });
      // Insert before first real item
      container.insertBefore(lastClone, firstIndexedItem);
      this.loopClones.push(lastClone);
      
      // Clone the first indexed item and append to end
      const firstClone = firstIndexedItem.cloneNode(true);
      // Mark as clone
      firstClone.classList.add("css-slide-clone", "css-slide-clone-end");
      firstClone.setAttribute("data-clone-index", 0);
      firstClone.setAttribute("data-is-clone", "true");
      // Remove snap class from clone so it doesn't interfere with indexing
      firstClone.classList.remove("css-slide--snap");
      // Ensure the cloned element itself is marked (in case it matches the selector)
      if (firstClone.matches && firstClone.matches(this.o.selector)) {
        firstClone.classList.add("css-slide-clone");
      }
      // Mark any nested elements that match the selector
      const firstCloneChildren = firstClone.querySelectorAll(this.o.selector);
      firstCloneChildren.forEach(slide => {
        slide.classList.add("css-slide-clone");
        slide.setAttribute("data-is-clone", "true");
      });
      // Append to end
      container.appendChild(firstClone);
      this.loopClones.push(firstClone);
      
      // Force multiple reflows to ensure clones are laid out
      container.offsetHeight;
      void container.offsetWidth;
      
      // Recalculate positions after clones are added
      const updatePositions = () => {
        // Re-query positions after clones are added
        const updatedFirstItem = this.querySelector(`${this.o.selector}.css-slide--snap:not(.css-slide-clone):not([data-is-clone])`);
        const updatedLastItem = Array.from(this.querySelectorAll(`${this.o.selector}.css-slide--snap:not(.css-slide-clone):not([data-is-clone])`)).pop();
        
        if (updatedFirstItem && updatedLastItem) {
          const firstItemMargin = parseInt(getComputedStyle(updatedFirstItem).marginLeft || 0);
          const firstRealPosition = updatedFirstItem.offsetLeft - firstItemMargin;
          const lastRealPosition = updatedLastItem.offsetLeft + updatedLastItem.offsetWidth - firstItemMargin;
          this.loopStartOffset = lastRealPosition;
          
          // Scroll to first real slide (not the clones) if resetting
          if (resetIndex && !this._sliderBlockScroll) {
            this._sliderBlockScroll = true;
            this.element.scrollLeft = firstRealPosition;
            setTimeout(() => {
              this._sliderBlockScroll = false;
            }, 200);
          }
        }
      };
      
      // Use multiple animation frames to ensure layout is complete
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            updatePositions();
          });
        });
      });
    }

    _removeLoopClones() {
      // Remove clones from DOM
      if (this.loopClones && this.loopClones.length > 0) {
        this.loopClones.forEach(clone => {
          if (clone && clone.parentNode) {
            clone.parentNode.removeChild(clone);
          }
        });
        this.loopClones = [];
      }
      
      // Also remove any orphaned clones that might exist
      const container = this.querySelector(".css-slider-container");
      if (container) {
        const orphanedClones = container.querySelectorAll(".css-slide-clone, [data-is-clone='true']");
        orphanedClones.forEach(clone => {
          if (clone.parentNode) {
            clone.parentNode.removeChild(clone);
          }
        });
      }
    }
  }

  if (typeof customElements.get("css-slider") == "undefined") {
    customElements.define("css-slider", CSSSlider);
  }

  document.addEventListener("shopify:section:load", (e) => {
    if (
      e.target.classList.contains("mount-css-slider") &&
      e.target.querySelector("css-slider")
    ) {
      e.target.querySelectorAll("css-slider").forEach((slider) => {
        if (slider.enabled) slider.resetSlider();
      });
    }
  });
}

!(function () {
  "use strict";
  function o() {
    var o = window,
      t = document;
    if (
      !(
        "scrollBehavior" in t.documentElement.style &&
        !0 !== o.__forceSmoothScrollPolyfill__
      )
    ) {
      var l,
        e = o.HTMLElement || o.Element,
        r = 468,
        i = {
          scroll: o.scroll || o.scrollTo,
          scrollBy: o.scrollBy,
          elementScroll: e.prototype.scroll || n,
          scrollIntoView: e.prototype.scrollIntoView,
        },
        s =
          o.performance && o.performance.now
            ? o.performance.now.bind(o.performance)
            : Date.now,
        c =
          ((l = o.navigator.userAgent),
          new RegExp(["MSIE ", "Trident/", "Edge/"].join("|")).test(l) ? 1 : 0);
      (o.scroll = o.scrollTo =
        function () {
          void 0 !== arguments[0] &&
            (!0 !== f(arguments[0])
              ? h.call(
                  o,
                  t.body,
                  void 0 !== arguments[0].left
                    ? ~~arguments[0].left
                    : o.scrollX || o.pageXOffset,
                  void 0 !== arguments[0].top
                    ? ~~arguments[0].top
                    : o.scrollY || o.pageYOffset,
                )
              : i.scroll.call(
                  o,
                  void 0 !== arguments[0].left
                    ? arguments[0].left
                    : "object" != typeof arguments[0]
                      ? arguments[0]
                      : o.scrollX || o.pageXOffset,
                  void 0 !== arguments[0].top
                    ? arguments[0].top
                    : void 0 !== arguments[1]
                      ? arguments[1]
                      : o.scrollY || o.pageYOffset,
                ));
        }),
        (o.scrollBy = function () {
          void 0 !== arguments[0] &&
            (f(arguments[0])
              ? i.scrollBy.call(
                  o,
                  void 0 !== arguments[0].left
                    ? arguments[0].left
                    : "object" != typeof arguments[0]
                      ? arguments[0]
                      : 0,
                  void 0 !== arguments[0].top
                    ? arguments[0].top
                    : void 0 !== arguments[1]
                      ? arguments[1]
                      : 0,
                )
              : h.call(
                  o,
                  t.body,
                  ~~arguments[0].left + (o.scrollX || o.pageXOffset),
                  ~~arguments[0].top + (o.scrollY || o.pageYOffset),
                ));
        }),
        (e.prototype.scroll = e.prototype.scrollTo =
          function () {
            if (void 0 !== arguments[0])
              if (!0 !== f(arguments[0])) {
                var o = arguments[0].left,
                  t = arguments[0].top;
                h.call(
                  this,
                  this,
                  void 0 === o ? this.scrollLeft : ~~o,
                  void 0 === t ? this.scrollTop : ~~t,
                );
              } else {
                if ("number" == typeof arguments[0] && void 0 === arguments[1])
                  throw new SyntaxError("Value could not be converted");
                i.elementScroll.call(
                  this,
                  void 0 !== arguments[0].left
                    ? ~~arguments[0].left
                    : "object" != typeof arguments[0]
                      ? ~~arguments[0]
                      : this.scrollLeft,
                  void 0 !== arguments[0].top
                    ? ~~arguments[0].top
                    : void 0 !== arguments[1]
                      ? ~~arguments[1]
                      : this.scrollTop,
                );
              }
          }),
        (e.prototype.scrollBy = function () {
          void 0 !== arguments[0] &&
            (!0 !== f(arguments[0])
              ? this.scroll({
                  left: ~~arguments[0].left + this.scrollLeft,
                  top: ~~arguments[0].top + this.scrollTop,
                  behavior: arguments[0].behavior,
                })
              : i.elementScroll.call(
                  this,
                  void 0 !== arguments[0].left
                    ? ~~arguments[0].left + this.scrollLeft
                    : ~~arguments[0] + this.scrollLeft,
                  void 0 !== arguments[0].top
                    ? ~~arguments[0].top + this.scrollTop
                    : ~~arguments[1] + this.scrollTop,
                ));
        }),
        (e.prototype.scrollIntoView = function () {
          if (!0 !== f(arguments[0])) {
            var l = (function (o) {
                for (
                  ;
                  o !== t.body &&
                  !1 ===
                    ((e = p((l = o), "Y") && a(l, "Y")),
                    (r = p(l, "X") && a(l, "X")),
                    e || r);

                )
                  o = o.parentNode || o.host;
                var l, e, r;
                return o;
              })(this),
              e = l.getBoundingClientRect(),
              r = this.getBoundingClientRect();
            l !== t.body
              ? (h.call(
                  this,
                  l,
                  l.scrollLeft + r.left - e.left,
                  l.scrollTop + r.top - e.top,
                ),
                "fixed" !== o.getComputedStyle(l).position &&
                  o.scrollBy({ left: e.left, top: e.top, behavior: "smooth" }))
              : o.scrollBy({ left: r.left, top: r.top, behavior: "smooth" });
          } else
            i.scrollIntoView.call(
              this,
              void 0 === arguments[0] || arguments[0],
            );
        });
    }
    function n(o, t) {
      (this.scrollLeft = o), (this.scrollTop = t);
    }
    function f(o) {
      if (
        null === o ||
        "object" != typeof o ||
        void 0 === o.behavior ||
        "auto" === o.behavior ||
        "instant" === o.behavior
      )
        return !0;
      if ("object" == typeof o && "smooth" === o.behavior) return !1;
      throw new TypeError(
        "behavior member of ScrollOptions " +
          o.behavior +
          " is not a valid value for enumeration ScrollBehavior.",
      );
    }
    function p(o, t) {
      return "Y" === t
        ? o.clientHeight + c < o.scrollHeight
        : "X" === t
          ? o.clientWidth + c < o.scrollWidth
          : void 0;
    }
    function a(t, l) {
      var e = o.getComputedStyle(t, null)["overflow" + l];
      return "auto" === e || "scroll" === e;
    }
    function d(t) {
      var l,
        e,
        i,
        c,
        n = (s() - t.startTime) / r;
      (c = n = n > 1 ? 1 : n),
        (l = 0.5 * (1 - Math.cos(Math.PI * c))),
        (e = t.startX + (t.x - t.startX) * l),
        (i = t.startY + (t.y - t.startY) * l),
        t.method.call(t.scrollable, e, i),
        (e === t.x && i === t.y) || o.requestAnimationFrame(d.bind(o, t));
    }
    function h(l, e, r) {
      var c,
        f,
        p,
        a,
        h = s();
      l === t.body
        ? ((c = o),
          (f = o.scrollX || o.pageXOffset),
          (p = o.scrollY || o.pageYOffset),
          (a = i.scroll))
        : ((c = l), (f = l.scrollLeft), (p = l.scrollTop), (a = n)),
        d({
          scrollable: c,
          method: a,
          startTime: h,
          startX: f,
          startY: p,
          x: e,
          y: r,
        });
    }
  }
  "object" == typeof exports && "undefined" != typeof module
    ? (module.exports = { polyfill: o })
    : o();
})();
