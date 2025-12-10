document.addEventListener('DOMContentLoaded', function () {
  const filterButton = document.querySelector('.section-heading-facets-button');
  const facetFiltersForm = document.querySelector('#FacetFiltersForm');

  if (filterButton && facetFiltersForm) {
    filterButton.addEventListener('click', function () {
      const isActive = facetFiltersForm.classList.toggle('filter-active');
      filterButton.textContent = isActive ? 'Hide Filters' : 'Show Filters';
    });
  }
});