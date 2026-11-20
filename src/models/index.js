// Loads every model AND the associations (relations.js) in one place.
// Anything that uses `include` must import models from here (or import this file once at startup).
export {
    User,
    Product,
    Cart,
    CartItem,
    Order,
    OrderItem,
    Payment
} from './relations.js';
