
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

        recipientName: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        phone: {
            type: DataTypes.STRING(20),
            allowNull: false
        },

        shippingAddress: {
            type: DataTypes.STRING(500),
            allowNull: false
        },

        totalPrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },

        status: {
            type: DataTypes.ENUM(
                'pending',
                'reserved',
                'paid',
                'confirmed',
                'shipped',
                'delivered',
                'cancelled'
            ),
            allowNull: false,
            defaultValue: 'pending'
        },

        reservationExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: 'orders',
        timestamps: true
    }
);

export default Order;
