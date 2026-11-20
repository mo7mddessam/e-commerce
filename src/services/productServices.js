import Product from '../models/product.js';
import { httpError } from '../utils/httpError.js';

export async function newproduct({ name, description, price, stock, imageUrl }) {
    const existingproduct = await Product.findOne({
        where: { name, description }
    });

    if (existingproduct) {
        throw httpError(409, 'A product with the same name and description already exists');
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
        throw httpError(404, 'Product is not found');
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
        throw httpError(409, 'A product with the same name and description already exists');
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
        throw httpError(404, 'Product is not found');
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
      throw httpError(404, 'the product is not found');
  }

  return theproduct;
}
