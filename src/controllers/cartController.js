import {addToCart,getCart,updateCartItem,deletefromcart,clearCart} from '../services/cartServices.js';

export async function addToCartt(req, res, next) {
    try {
        const { productId, quantity } = req.body;

        const cartItem = await addToCart(
            req.user.id,           //gbt el user id mn req mesh req.body 3shan user momkn yb3t id m5tlf wkda hsm7lo y3dl gi cart tania
            productId,
            quantity
        );

        res.status(201).json({
            message: 'Product added to cart successfully',
            cartItem
        });
    } catch (error) {
        next(error);
    }
}

export async function getCartt(req, res, next) {
    try {
        const cart = await getCart(req.user.id);

        res.status(200).json({ cart });
    } catch (error) {
        next(error);
    }
}

export async function updateCartItemt(req, res, next) {
    try {
        const { productId, quantity } = req.body;

        const cartItem = await updateCartItem(
            req.user.id,
            productId,
            quantity
        );

        res.status(200).json({
            message: 'Cart item updated successfully',
            cartItem
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteCartItemt(req, res, next) {
    try {
        const { productId } = req.params;

        const result = await deletefromcart(
            req.user.id,
            productId
        );

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

export async function clearCartt(req, res, next) {
    try {
        const result = await clearCart(req.user.id);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
