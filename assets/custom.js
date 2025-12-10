window.sc_add_to_cart = async (variant_id, quantity = 1) => {
		if (!variant_id) return;

		const formData = {
			items: [{
                id: variant_id,
                quantity: quantity
            }]
		};

		try {
			const response = await fetch(window.Shopify.routes.root + 'cart/add.js', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});
			const result = await response.json();
			console.log('Added to cart:', result);

			if (typeof window.refreshCart === 'function') {
				window.refreshCart();
			}

            return result;

		} catch (error) {
			console.error('Error adding items to cart:', error);
		}

        
}