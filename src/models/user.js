
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const user = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('customer', 'admin'),
            defaultValue: 'customer'
        }
    },
    {
        tableName: 'users',
        timestamps: true
    }
);

export default user;
