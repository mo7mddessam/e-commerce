
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const product = sequelize.define(
    'product',
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
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        stock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        reservedStock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        imageUrl: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    },
    {
        tableName: 'products',
        timestamps: true
    }
);

export default product;
