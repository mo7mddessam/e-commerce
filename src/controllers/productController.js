
import {
    newproduct,
    updateproduct,
    deleteproduct,
    getallproducts,
    getproductbyid
} from '../services/productServices.js';

export async function createProduct(req, res, next) {
    try {
        const { name, description, price, stock, imageUrl } = req.body;

        const newwproduct = await newproduct({ name, description, price, stock, imageUrl });
        res.status(201).json(newwproduct);
    } catch (err) {
        next(err);
    }
}

export async function updateProduct(req, res, next) {
    try {
        const { name, description, price, stock, imageUrl } = req.body;

        const updproduct = await updateproduct(
            req.params.id,
            { name, description, price, stock, imageUrl }
        );

        res.status(200).json(updproduct);
    } catch (err) {
        next(err);
    }
}
export async function deleteProduct(req, res, next) {
  try {
    const id = req.params.id;
    const deletedproduct = await deleteproduct(id);
    res.status(200).json(deletedproduct);
  } catch (err) {
    next(err);
  }
}
export async function getAllProducts(req, res, next) {
  try {
    const products = await getallproducts();
    res.status(200).json(products);
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req, res, next) {
  try {
    const id = req.params.id;
    const product = await getproductbyid(id);
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
}
