document.addEventListener('DOMContentLoaded', function() {
  if(window.location.hash) {
    window.scrollTo(0, 0)
    const targetId = window.location.hash.substring(1)
    const targetElement = document.getElementById(targetId)
    
    if(targetElement) {
      const headerHeight = document.querySelector('header, .sticky-header').offsetHeight || 0
      const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      })
    }
  }
})