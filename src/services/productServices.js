
import Product from '../models/Product.js';

export async function newproduct({ name, description, price, stock, imageUrl }) {
    const existingproduct = await Product.findOne({
        where: { name, description }
    });

    if (existingproduct) {
        const error = new Error('A product with the same name and description already exists');
        error.statusCode = 409;
        throw error;
    }

    const product = await Product.create({
        name,
        description,
        price,
        stock,
        imageUrl
    });

    return {
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        imageUrl: product.imageUrl
    };
}

export async function updateproduct(id, { name, description, price, stock, imageUrl }) {
    const theproduct = await Product.findByPk(id);

    if (!theproduct) {
        const error = new Error('Product is not found');
        error.statusCode = 404;
        throw error;
    }

  //3ml variable updatedname hyakhod (- name lw hwa undefined y3ni mesh mt7aded) aww (- theproduct.name elesm elgdeed)
  const updatedName = name !== undefined ? name : theproduct.name;
  //nfs elkalam
    const updatedDescription = description !== undefined ? description : theproduct.description;

    const existingproduct = await Product.findOne({
        where: {
            name: updatedName,
            description: updatedDescription
        }
    });

    if (existingproduct && existingproduct.id !== theproduct.id) {
        const error = new Error('A product with the same name and description already exists');
        error.statusCode = 409;
        throw error;
    }

    if (name !== undefined) theproduct.name = name;
    if (description !== undefined) theproduct.description = description;
    if (price !== undefined) theproduct.price = price;
    if (stock !== undefined) theproduct.stock = stock;
    if (imageUrl !== undefined) theproduct.imageUrl = imageUrl;

    await theproduct.save();

    return {
        name: theproduct.name,
        description: theproduct.description,
        price: theproduct.price,
        stock: theproduct.stock,
        imageUrl: theproduct.imageUrl
    };
}

export async function deleteproduct(id) {
    const theproduct = await Product.findByPk(id);

    if (!theproduct) {
        const error = new Error('Product is not found');
        error.statusCode = 404;
        throw error;
    }

    await theproduct.destroy();

    return {
        message: 'Product deleted successfully'
    };
}

export async function getallproducts() {
    const products = await Product.findAll();
    return products;
}

export async function getproductbyid(id) {
  const theproduct = await Product.findByPk(id);
  if (!theproduct){
      const error = new Error('the product is not found');
      error.statusCode = 404;
      throw error;
  }

  return theproduct;
}
