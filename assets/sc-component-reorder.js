/* SC 
Component Button Reorder
 */

class SCReorderButton extends HTMLElement {
	constructor() {
		super();
		this.orderItems = [];
		this.addEventListener('click', this.handleClick.bind(this));
	}

	connectedCallback() {
		try {
			const raw = this.dataset.jsReorderItems;
			this.orderItems = JSON.parse(raw);
		} catch (e) {
			console.error('Invalid JSON in data-js-reorder-items:', e);
		}

		try {
			const raw = this.dataset.jsReorderMessages;
			this.messages = JSON.parse(raw);
		} catch (e) {
			console.error('Invalid JSON in data-js-reorder-messages:', e);
		}
	}

	async handleClick() {
		if (!Array.isArray(this.orderItems)) return;

		const formData = {
			items: this.orderItems.map(item => {
				if(item.available){
					return (
						{
							id: item.variant_id,
							quantity: item.quantity
						}
					)
				}
				})
		};

		console.log('Submitting reorder:', formData);

		if(formData.items && formData.items.length > 0){

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

			if (typeof Notyf === 'function') {
				var notyf = new Notyf({
					duration: 2000,
					position: { x: 'left', y: 'top' }
				});
				
				this.orderItems.map(item => {
					if(!item.available){
						console.log(item);
						notyf.error( this.messages.product +' '+ item.title +' ' + this.messages.not_available );	
					}
				})

				
			}

			if (typeof window.refreshCart === 'function') {
				window.refreshCart();
			}
		} catch (error) {
			console.error('Error adding items to cart:', error);
		}

	}else{
		if (typeof Notyf === 'function') {
			var notyf = new Notyf({
				duration: 5000,
				position: { x: 'left', y: 'top' }
			});
			notyf.error(this.messages.no_products_available);
		}
	}
	}
}

customElements.define('sc-reorder-button', SCReorderButton);
