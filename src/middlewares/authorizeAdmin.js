export function authorizeAdmin(req, res, next) {
    if (req.user.role!=='admin') {
        return res.status(403).json({
            message: 'You are not allowed to modify the products'
        });
    }

    next();
}
