
import Product from '../models/product.js';
import Cart from '../models/cart.js';
import CartItem from '../models/cartitem.js';

export async function addToCart(userId, productId, quantity) {
  //ngieb el product
    const product = await Product.findByPk(productId);
    if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
    }

  //nshof el cart mawgoda wala la aslan
    let cart = await Cart.findOne({
        where: { userId }
    });

    if (!cart) {
        cart = await Cart.create({ userId });
    }

  //nshof el product dh fi el cart aslan wala la
    let cartItem = await CartItem.findOne({
        where: {
            cartId: cart.id,
            productId
        }
    });

  //lw fie 7aga fi cart 5od el kemia bta3tha law mafiesh khali newQuantity=0
  // we egm3ha 3la quantity eli user talabha
    const newQuantity = (cartItem ? cartItem.quantity : 0) + quantity;

  //el2aked en el kemia mesh a3la mn el stock
    if (newQuantity > product.stock) {
        const error = new Error('Not enough stock');
        error.statusCode = 400;
        throw error;
    }

  //lw el product mwgood est5dm el newQuantity
    if (cartItem) {
        cartItem.quantity = newQuantity;
        await cartItem.save();
    } else {                     //lw la s3ml product gdeed fi el cart b data eli b3rahal m3 el function
        cartItem = await CartItem.create({
            cartId: cart.id,
            productId,
            quantity
        });
    }

    return cartItem;
}

export async function getCart(userId) {
    const cart = await Cart.findOne({
        where: { userId }
    });

    if (!cart) {
        const error = new Error('Cart not found');
        error.statusCode = 404;
        throw error;
    }

    const result = await CartItem.findAll({
        where: { cartId: cart.id },
        include: [Product]
    });

    return result;
}

export async function updateCartItem(userId, productId, quantity) {
    // Check if the user's cart exists
    const cart = await Cart.findOne({
        where: { userId }
    });

    if (!cart) {
        const error = new Error('Cart not found');
        error.statusCode = 404;
        throw error;
    }

    // Check if the product exists in the cart
    const cartItem = await CartItem.findOne({
        where: {
            cartId: cart.id,
            productId
        }
    });

    if (!cartItem) {
        const error = new Error('Product not found in cart');
        error.statusCode = 404;
        throw error;
    }

    // Get the product details
    const product = await Product.findByPk(productId);

    if (!product) {
        const error = new Error('Product not found');
        error.statusCode = 404;
        throw error;
    }

    // Check stock availability
    if (quantity > product.stock) {
        const error = new Error('Not enough stock');
        error.statusCode = 400;
        throw error;
    }

    // Update the quantity
    cartItem.quantity = quantity;
    await cartItem.save();

    return cartItem;
}

export async function deletefromcart(userId, productId) {
    // Check cart
    const cart = await Cart.findOne({
        where: { userId }
    });

    if (!cart) {
        const error = new Error('Cart not found');
        error.statusCode = 404;
        throw error;
    }

    // Check if the product exists in the cart
    const cartItem = await CartItem.findOne({
        where: {
            cartId: cart.id,
            productId
        }
    });

    if (!cartItem) {
        const error = new Error('Product not found in cart');
        error.statusCode = 404;
        throw error;
    }

    // Delete the item from the cart
    await cartItem.destroy();

    return {
        msg: 'Product has been deleted from cart'
    };
}

export async function clearCart(userId) {
    // Check if the user's cart exists
    const cart = await Cart.findOne({
        where: { userId }
    });

    if (!cart) {
        const error = new Error('Cart not found');
        error.statusCode = 404;
        throw error;
    }

    // Delete all items from the cart
    await CartItem.destroy({
        where: { cartId: cart.id }
    });

    return {
        msg: 'Cart has been cleared'
    };
}
