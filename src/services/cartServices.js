import { Product, Cart, CartItem } from '../models/relations.js';

export async function addToCart(userId, productId, quantity) {

  const product = await Product.findByPk(productId);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
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
    const error = new Error('Not enough stock');
    error.statusCode = 400;
    throw error;
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
    const error = new Error('Cart not found');
    error.statusCode = 404;
    throw error;
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
    const error = new Error('Cart not found');
    error.statusCode = 404;
    throw error;
  }

  const cartItem = await CartItem.findOne({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  if (!cartItem) {
    const error = new Error('Product not found in cart');
    error.statusCode = 404;
    throw error;
  }

  const product = await Product.findByPk(productId);

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  if (quantity > product.stock) {
    const error = new Error('Not enough stock');
    error.statusCode = 400;
    throw error;
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
    const error = new Error('Cart not found');
    error.statusCode = 404;
    throw error;
  }

  const cartItem = await CartItem.findOne({
    where: {
      cartId: cart.id,
      productId,
    },
  });

  if (!cartItem) {
    const error = new Error('Product not found in cart');
    error.statusCode = 404;
    throw error;
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
    const error = new Error('Cart not found');
    error.statusCode = 404;
    throw error;
  }

  await CartItem.destroy({
    where: { cartId: cart.id },
  });

  return {
    msg: 'Cart has been cleared',
  };
}
