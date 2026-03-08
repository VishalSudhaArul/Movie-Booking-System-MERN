exports.adminAccess = (req, res, next) => {

    if (req.user.role === "admin" || req.user.role === "theaterOwner") {
        next();
    } else {
        return res.status(403).json({
            message: "Admin or Theater Owner access only"
        });
    }

};

// admin
// theaterOwner