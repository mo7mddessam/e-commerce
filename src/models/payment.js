
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Payment = sequelize.define(
    'Payment',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        method: {
            type: DataTypes.ENUM('cash', 'card'),
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM(
                'pending',
                'successful',
                'failed'
            ),
            allowNull: false,
            defaultValue: 'pending'
        }
    },
    {
        tableName: 'Payments',
        timestamps: false
    }
);

export default Payment;
