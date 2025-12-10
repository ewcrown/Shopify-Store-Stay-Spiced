import compareStorage from "./sc-compare-storage.js"

function addCompareButton(button) {
    let storage = compareStorage()

    let dataset = button.dataset

    let productId = dataset.productId
    let productHandle = dataset.productHandle
    let productImage = dataset.productImage
    let productPriceAt = dataset.productPriceAt
    let productPrice = dataset.productPrice
    let productName = dataset.productName
    let productURL = dataset.productUrl
    let locate = dataset.productTranslations
    let metaobjects = dataset.productObjects
    let skus = dataset.productSkus

    if(storage?.store.length > 0){
       if(storage.store.find((p)=>{ return p.id == productId })){
           button.classList.add('active');
       }
    }


    button.addEventListener('click', e => {
        let storageResponse = storage.add({
            id: productId, 
            handle: productHandle, 
            image: productImage,
            compare_at_price: productPriceAt,
            price: productPrice,
            name: productName,
            skus: skus,
            url: productURL,
            translate: locate,
            metaobjects: metaobjects ? JSON.parse(metaobjects) : {}
        })
        if(storageResponse) {
            button.classList.add('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', e => {
    let compareButtons = document.querySelectorAll('[product-add-to-compare]')
    compareButtons.forEach(button => {
        addCompareButton(button)
    })
})