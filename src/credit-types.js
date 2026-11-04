export const CARD_PAYMENT_CATEGORY='Thanh toán thẻ';
const fold=value=>String(value||'').trim().normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/đ/g,'d').replace(/\s+/g,' ');
const categories=new Set(['thanh toan the','thanh toan the tin dung','thanh toan paypay']);
export const isCardPaymentCategory=category=>categories.has(fold(category));
// A normal daily cash expense, separate from protected legacy statement links.
export const isTrackingCardPayment=item=>!item.cardPaymentMonth&&!item.cardFeeMonth&&item.paymentMethod!=='card'&&isCardPaymentCategory(item.category);
