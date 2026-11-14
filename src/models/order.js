
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Order = sequelize.define(
    'Order',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        totalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM(
                'pending',
                'confirmed',
                'shipped',
                'delivered',
                'cancelled'
            ),
            allowNull: false,
            defaultValue: 'pending'
        }
    },
    {
        tableName: 'Orders',
        timestamps: false
    }
);

export default Order;
