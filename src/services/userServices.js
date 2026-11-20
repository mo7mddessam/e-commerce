import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { httpError } from '../utils/httpError.js';

export async function registerUser({ name, email, password }) {
    const existingacc = await User.findOne({
        where: { email }
    });

    if (existingacc) {
        throw httpError(409, 'Email has already been used');
    }

    const hashedPass = await bcrypt.hash(password, 12);

    const user = await User.create({
        name,
        email,
        password: hashedPass,
        role: 'customer'
    });

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };
}

export async function loginUser({ email, password }) {
    const user = await User.findOne({
        where: { email }
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw httpError(401, 'Invalid email or password');
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    return {
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    };
}

export async function getUserById(id) {
    const user = await User.findByPk(id, {
        attributes: { exclude: ['password'] } //b3ml exept le el3mod dah
    });

    if (!user) {
        throw httpError(404, 'User not found');
    }

    return user;
}

export async function updateUser(id, { name, email, password }) {

    const user = await User.findByPk(id);

    if (!user) {
        throw httpError(404, 'User not found');
    }

  //n3ml elshroot bta3tna 3la kol 7aga momken tndaf

    // Net2aked en el email el gedid etba3at w mokhtalef 3an el email el 7aly
    if (email && email !== user.email) {

        // Benedawar fel database 3ala ay user tany mostakhdem nafs el email el gedid
        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            throw httpError(409, 'Email is already registered');
        }
        user.email = email;
    }

    if (name) user.name = name;

    // nfs elkalam bs h3ml hash
    if (password) {
        user.password = await bcrypt.hash(password, 12);
    }

    await user.save();

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    };
}

export async function deleteUser(id) {
    const user = await User.findByPk(id);

    if (!user) {
        throw httpError(404, 'User is not found');
    }

    await user.destroy();

    return {
        message: 'User deleted successfully'
    };
}
