import { Product, Cart, CartItem } from '../models/index.js';
import { httpError } from '../utils/httpError.js';

export async function addToCart(userId, productId, quantity) {

  const product = await Product.findByPk(productId);
  if (!product) {
    throw httpError(404, 'Product not found');
  }

  let cart = await Cart.findOne({
    where: { userId },
  });

  if (!cart) {
    cart = await Cart.create({ userId });
  }

  let cartItem = await CartItem.findOne({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  const newQuantity = (cartItem ? cartItem.quantity : 0) + quantity;

  if (newQuantity > product.stock) {
    throw httpError(400, 'Not enough stock');
  }

  if (cartItem) {
    cartItem.quantity = newQuantity;
    await cartItem.save();
  } else {
    cartItem = await CartItem.create({
      cartId: cart.id,
      productId,
      quantity,
    });
  }

  return cartItem;
}

export async function getCart(userId) {
  const cart = await Cart.findOne({
    where: { userId },
  });

  if (!cart) {
    throw httpError(404, 'Cart not found');
  }

  const result = await CartItem.findAll({
    where: { cartId: cart.id },
    include: [{ model: Product, as: 'product' }]
  });

  return result;
}

export async function updateCartItem(userId, productId, quantity) {
  const cart = await Cart.findOne({
    where: { userId },
  });

  if (!cart) {
    throw httpError(404, 'Cart not found');
  }

  const cartItem = await CartItem.findOne({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  if (!cartItem) {
    throw httpError(404, 'Product not found in cart');
  }

  const product = await Product.findByPk(productId);

  if (!product) {
    throw httpError(404, 'Product not found');
  }

  if (quantity > product.stock) {
    throw httpError(400, 'Not enough stock');
  }

  cartItem.quantity = quantity;
  await cartItem.save();

  return cartItem;
}

export async function deletefromcart(userId, productId) {
  const cart = await Cart.findOne({
    where: { userId },
  });

  if (!cart) {
    throw httpError(404, 'Cart not found');
  }

  const cartItem = await CartItem.findOne({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  if (!cartItem) {
    throw httpError(404, 'Product not found in cart');
  }

  await cartItem.destroy();

  return {
    msg: 'Product has been deleted from cart',
  };
}

export async function clearCart(userId) {
  const cart = await Cart.findOne({
    where: { userId },
  });

  if (!cart) {
    throw httpError(404, 'Cart not found');
  }

  await CartItem.destroy({
    where: { cartId: cart.id },
  });

  return {
    msg: 'Cart has been cleared',
  };
}
