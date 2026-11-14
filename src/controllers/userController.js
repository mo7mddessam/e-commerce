import {
    registerUser,
    loginUser,
    getUserById,
  updateUser,
  deleteUser
} from '../services/userServices.js';

export async function register(req, res, next) {
    try {
        const { name, email, password } = req.body;
        const user = await registerUser({ name, email, password });
        res.status(201).json(user);
    } catch (err) {        //tb3 throw error fi malaf elservice
        next(err);     //bb3t elerror l middleware error
    }
}

export async function login(req, res, next) {
    try {
        const { email, password } = req.body;
        const result = await loginUser({ email, password });
        res.status(200).json(result);
    } catch (err) {
        next(err);
    }
}

export async function getUser(req, res, next) {
    try {
        const user = await getUserById(req.params.id);
        res.status(200).json(user);
    } catch (err) {
        next(err);
    }
}

export async function getMe(req, res, next) {
    try {
        const user = await getUserById(req.user.id);
        res.status(200).json(user);
    } catch (err) {
        next(err);
    }
}

export async function update(req, res, next) {
    try {
        const { name, email, password } = req.body;
        const user = await updateUser(req.params.id, { name, email, password });
        res.status(200).json(user);
    } catch (err) {
        next(err);
    }
}

export async function deletee(req, res, next) {
    try {
        const id = req.params.id;

        const deletedUser = await deleteUser(id);

        res.status(200).json(deletedUser);
    } catch (err) {
        next(err);
    }
}
