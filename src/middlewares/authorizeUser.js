export function authorizeUser(req, res, next) {
    if (req.user.id !== Number(req.params.id) && req.user.role!=='admin') {
        return res.status(403).json({
            message: 'You are not allowed to modify this user'
        });
    }

    next();
}
