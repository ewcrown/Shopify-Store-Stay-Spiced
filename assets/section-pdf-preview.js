document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("pdf-preview-container");
  const pdfUrl = container?.getAttribute("data-pdf-url");

  if (pdfUrl) {
    let pdfDoc = null,
      pageNum = 1,
      pageRendering = false;

    if (pdfUrl) {
      const container = document.getElementById("pdf-preview-container");
      const prevButton = document.getElementById("prev-page");
      const nextButton = document.getElementById("next-page");

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument(pdfUrl);

      loadingTask.promise
        .then(function (pdf) {
          pdfDoc = pdf;

          renderPages(pageNum); // <== This ensures the first page is displayed immediately
        })
        .catch((err) => {
          console.log("Error loading the PDF", err);
        });

      function renderPages(num) {
        pageRendering = true;
        container.innerHTML = ""; // Clear container for new render

        const isMobile = window.innerWidth <= 768; // Mobile mode threshold

        // Render the current page
        pdfDoc
          .getPage(num)
          .then(function (page) {
            const viewport = page.getViewport({ scale: 1 });

            // Calculate the scale to fit the container's width and height
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;

            const widthScale = containerWidth / viewport.width;
            const heightScale = containerHeight / viewport.height;
            const scale = Math.min(widthScale, heightScale); // Choose the smaller scale to fit both width and height

            const scaledViewport = page.getViewport({ scale: scale });

            // Create a wrapper div for the canvas and page number
            const pageWrapper = document.createElement("div");
            pageWrapper.style.textAlign = "center"; // Center the page number below the canvas
            pageWrapper.style.marginBottom = "30px"; // Add some space between the canvas and the next one

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            canvas.height = scaledViewport.height;
            canvas.width = scaledViewport.width;

            pageWrapper.appendChild(canvas); // Append the canvas to the wrapper

            const renderContext = {
              canvasContext: context,
              viewport: scaledViewport,
            };

            // Render the page
            page.render(renderContext).promise.then(() => {
              // Create a page number element
              const pageNumberElem = document.createElement("div");
              pageNumberElem.textContent = `Page ${num}`;
              pageNumberElem.style.fontSize = "16px"; // Adjust font size as needed
              pageNumberElem.style.color = "black"; // Adjust color as needed

              // Append the page number below the canvas
              pageWrapper.appendChild(pageNumberElem);
            });

            // Append the wrapper to the container
            container.appendChild(pageWrapper);
          })
          .catch((err) => {
            console.log("Error rendering the PDF", err);
          });

        // Render the second page (if it exists) only on non-mobile screens
        if (!isMobile && num + 1 <= pdfDoc.numPages) {
          pdfDoc
            .getPage(num + 1)
            .then(function (page) {
              const viewport = page.getViewport({ scale: 1 });

              // Calculate the scale to fit the container's width and height
              const containerWidth = container.clientWidth;
              const containerHeight = container.clientHeight;

              const widthScale = containerWidth / viewport.width;
              const heightScale = containerHeight / viewport.height;
              const scale = Math.min(widthScale, heightScale); // Choose the smaller scale to fit both width and height

              const scaledViewport = page.getViewport({ scale: scale });

              // Create a wrapper div for the canvas and page number
              const pageWrapper = document.createElement("div");
              pageWrapper.style.textAlign = "center"; // Center the page number below the canvas
              pageWrapper.style.marginBottom = "30px"; // Add some space between the canvas and the next one

              const canvas = document.createElement("canvas");
              const context = canvas.getContext("2d");
              canvas.height = scaledViewport.height;
              canvas.width = scaledViewport.width;

              pageWrapper.appendChild(canvas); // Append the canvas to the wrapper

              const renderContext = {
                canvasContext: context,
                viewport: scaledViewport,
              };

              // Render the second page
              page.render(renderContext).promise.then(() => {
                // Create a page number element
                const pageNumberElem = document.createElement("div");
                pageNumberElem.textContent = `Page ${num + 1}`;
                pageNumberElem.style.fontSize = "16px"; // Adjust font size as needed
                pageNumberElem.style.color = "black"; // Adjust color as needed

                // Append the page number below the canvas
                pageWrapper.appendChild(pageNumberElem);
              });

              // Append the wrapper to the container
              container.appendChild(pageWrapper);
            })
            .catch((err) => {
              console.log("Error rendering the PDF", err);
            });
        }

        pageRendering = false;
      }

      // Go to the previous pages
      function onPrevPage() {
        const isMobile = window.innerWidth <= 768;
        if (pageNum <= 1) {
          return;
        }
        pageNum -= isMobile ? 1 : 2;
        renderPages(pageNum);
      }

      // Go to the next pages
      function onNextPage() {
        const isMobile = window.innerWidth <= 768;
        if (pageNum + (isMobile ? 1 : 2) > pdfDoc.numPages) {
          return;
        }
        pageNum += isMobile ? 1 : 2;
        renderPages(pageNum);
      }

      prevButton.addEventListener("click", onPrevPage);
      nextButton.addEventListener("click", onNextPage);
    }
  }
});
